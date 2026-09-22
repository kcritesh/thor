import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AnalysisService } from '../analysis/analysis.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { WorkItemStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWorkItemDto } from './dto/create-work-item.dto.js';
import { MANUAL_TARGETS, canTransition, sourcesFor } from './workflow.js';

const { RECEIVED, ANALYSING, READY_FOR_REVIEW, FAILED } = WorkItemStatus;

@Injectable()
export class WorkItemsService {
  private readonly logger = new Logger(WorkItemsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analysis: AnalysisService,
  ) {}

  // The unique index on externalId is the idempotency guarantee: concurrent
  // duplicates lose the insert race with P2002 and read back the winner's row.
  async create(dto: CreateWorkItemDto) {
    try {
      const item = await this.prisma.workItem.create({ data: dto });
      return { item, created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const item = await this.prisma.workItem.findUniqueOrThrow({
          where: { externalId: dto.externalId },
        });
        return { item, created: false };
      }
      throw error;
    }
  }

  list(status?: WorkItemStatus) {
    return this.prisma.workItem.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.workItem.findUnique({
      where: { id },
      include: { attempts: { orderBy: { createdAt: 'desc' } } },
    });
    if (!item) throw new NotFoundException(`Work item ${id} not found`);
    return item;
  }

  async updateStatus(id: string, status: WorkItemStatus) {
    if (!MANUAL_TARGETS.includes(status)) {
      throw new BadRequestException(
        `Status ${status} is system-managed and cannot be set manually`,
      );
    }
    await this.transition(id, sourcesFor(status), status);
    return this.findOne(id);
  }

  analyse(id: string) {
    return this.runAnalysis(id, RECEIVED);
  }

  retry(id: string) {
    return this.runAnalysis(id, FAILED);
  }

  // Claiming ANALYSING via compare-and-set means only one request calls the
  // LLM. The result write is also conditional on ANALYSING, and a failed
  // analysis only touches lastError, so bad AI output never corrupts the item.
  private async runAnalysis(id: string, from: WorkItemStatus) {
    const item = await this.transition(id, [from], ANALYSING, {
      lastError: null,
    });
    const { result, attempt } = await this.analysis.analyse(item);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.analysisAttempt.create({
          data: { ...attempt, workItemId: id },
        });
        if (result) {
          await this.transition(
            id,
            [ANALYSING],
            READY_FOR_REVIEW,
            { ...result, analysedAt: new Date() },
            tx,
          );
        } else {
          await this.transition(
            id,
            [ANALYSING],
            FAILED,
            { lastError: attempt.errorMessage },
            tx,
          );
        }
      });
    } catch (error) {
      this.logger.error(`Saving analysis for ${id} failed`, error);
      await this.prisma.workItem.updateMany({
        where: { id, status: ANALYSING },
        data: { status: FAILED, lastError: 'Failed to save analysis result' },
      });
      throw error;
    }
    return this.findOne(id);
  }

  // Compare-and-set: the update only matches while the row is still in an
  // allowed source status, so concurrent requests cannot both win.
  private async transition(
    id: string,
    from: WorkItemStatus[],
    to: WorkItemStatus,
    data: Prisma.WorkItemUpdateManyMutationInput = {},
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const allowed = from.filter((status) => canTransition(status, to));
    const [updated] = await db.workItem.updateManyAndReturn({
      where: { id, status: { in: allowed } },
      data: { ...data, status: to },
    });
    if (updated) return updated;

    const current = await db.workItem.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) throw new NotFoundException(`Work item ${id} not found`);
    throw new ConflictException(
      `Cannot move work item to ${to}: it is ${current.status}, expected ${allowed.join(' or ')}`,
    );
  }
}
