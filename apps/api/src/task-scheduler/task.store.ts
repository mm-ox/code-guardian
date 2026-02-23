import { Injectable } from '@nestjs/common';
import { AbstractTask } from './abstract-task';

@Injectable()
export class TaskStore {
  private readonly tasks = new Map<string, AbstractTask<unknown>>();

  save(task: AbstractTask<unknown>): void {
    this.tasks.set(task.id, task);
  }

  get(id: string): AbstractTask<unknown> | null {
    return this.tasks.get(id) ?? null;
  }
}
