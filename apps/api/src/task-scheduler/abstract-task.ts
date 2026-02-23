import { randomUUID } from 'crypto';

export const TaskStatus = {
  Pending: 'Pending',
  Running: 'Running',
  Completed: 'Completed',
  Failed: 'Failed',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export abstract class AbstractTask<TData> {
  readonly id: string;
  readonly data: TData;
  readonly createdAt: Date;
  status: TaskStatus;
  error: string | null;

  constructor(data: TData) {
    this.id = randomUUID();
    this.data = data;
    this.status = TaskStatus.Pending;
    this.error = null;
    this.createdAt = new Date();
  }
}
