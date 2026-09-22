import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { WorkItemStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWorkItemDto } from './dto/create-work-item.dto.js';

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
}
