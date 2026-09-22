import { IsEnum } from 'class-validator';
import { WorkItemStatus } from '../../generated/prisma/enums.js';

export class UpdateStatusDto {
  @IsEnum(WorkItemStatus)
  status: WorkItemStatus;
}
