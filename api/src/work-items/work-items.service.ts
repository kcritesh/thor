import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { WorkItemStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWorkItemDto } from './dto/create-work-item.dto.js';
import { MANUAL_TARGETS, canTransition, sourcesFor } from './workflow.js';

@Injectable()
export class WorkItemsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const { count } = await db.workItem.updateMany({
      where: { id, status: { in: allowed } },
      data: { ...data, status: to },
    });
    if (count > 0) return;

    const current = await db.workItem.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) throw new NotFoundException(`Work item ${id} not found`);
    throw new ConflictException(
      `Cannot move work item from ${current.status} to ${to}`,
    );
  }
}
