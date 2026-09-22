import { IsEnum, IsOptional } from 'class-validator';
import { WorkItemStatus } from '../../generated/prisma/enums.js';

export class ListWorkItemsQuery {
  @IsOptional()
  @IsEnum(WorkItemStatus)
  status?: WorkItemStatus;
}
