import { Injectable, Logger } from '@nestjs/common';
import { AbstractTask, TaskStatus } from './abstract-task';
import { TaskDiscoveryService } from './task-discovery.service';
import { TaskStore } from './task.store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TaskConstructor = new (...args: any[]) => AbstractTask<unknown>;

@Injectable()
export class TaskScheduler {
  private readonly logger = new Logger(TaskScheduler.name);

  constructor(
    private readonly taskDiscovery: TaskDiscoveryService,
    private readonly taskStore: TaskStore
  ) {}

  schedule<TTask extends AbstractTask<unknown>>(task: TTask): TTask {
    const handler = this.taskDiscovery.getHandler(
      task.constructor as TaskConstructor
    );

    this.taskStore.save(task);
    this.executeInBackground(task, handler);

    return task;
  }

  getTask(id: string): AbstractTask<unknown> | null {
    return this.taskStore.get(id);
  }

  private executeInBackground(
    task: AbstractTask<unknown>,
    handler: { handle(task: AbstractTask<unknown>): Promise<void> }
  ): void {
    task.status = TaskStatus.Running;

    handler
      .handle(task)
      .then(() => {
        task.status = TaskStatus.Completed;
      })
      .catch((error: unknown) => {
        task.status = TaskStatus.Failed;
        task.error =
          error instanceof Error ? error.message : 'Unknown error occurred';
        this.logger.error(
          `Task ${task.id} (${task.constructor.name}) failed: ${task.error}`
        );
      });
  }
}
