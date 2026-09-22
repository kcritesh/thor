import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateWorkItemDto } from './dto/create-work-item.dto.js';
import { ListWorkItemsQuery } from './dto/list-work-items.query.js';
import { WorkItemsService } from './work-items.service.js';

@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly workItems: WorkItemsService) {}

  @Post()
  async create(
    @Body() dto: CreateWorkItemDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { item, created } = await this.workItems.create(dto);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return item;
  }

  @Get()
  list(@Query() query: ListWorkItemsQuery) {
    return this.workItems.list(query.status);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workItems.findOne(id);
  }
}
