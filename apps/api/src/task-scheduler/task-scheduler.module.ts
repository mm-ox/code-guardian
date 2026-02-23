import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TaskScheduler } from './task-scheduler.service';
import { TaskDiscoveryService } from './task-discovery.service';
import { TaskStore } from './task.store';

@Module({
  imports: [DiscoveryModule],
  providers: [TaskScheduler, TaskDiscoveryService, TaskStore],
  exports: [TaskScheduler],
})
export class TaskSchedulerModule {}
