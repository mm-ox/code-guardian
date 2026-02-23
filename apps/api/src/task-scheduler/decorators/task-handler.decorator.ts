import { Injectable, SetMetadata } from '@nestjs/common';
import { AbstractTask } from '../abstract-task';

export const TASK_HANDLER_METADATA_KEY = 'TASK_HANDLER_METADATA';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = unknown> = new (...args: any[]) => T;

export function TaskHandler(
  taskClass: Constructor<AbstractTask<unknown>>
): ClassDecorator {
  return (target) => {
    SetMetadata(TASK_HANDLER_METADATA_KEY, taskClass)(target);
    Injectable()(target);
  };
}
