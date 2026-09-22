import { Module } from '@nestjs/common';
import { AnalysisModule } from '../analysis/analysis.module.js';
import { WorkItemsController } from './work-items.controller.js';
import { WorkItemsService } from './work-items.service.js';

@Module({
  imports: [AnalysisModule],
  controllers: [WorkItemsController],
  providers: [WorkItemsService],
})
export class WorkItemsModule {}
