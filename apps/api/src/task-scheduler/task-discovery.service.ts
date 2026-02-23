import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { AbstractTask } from './abstract-task';
import { AbstractTaskHandler } from './abstract-task-handler';
import { TASK_METADATA_KEY } from './decorators/task.decorator';
import { TASK_HANDLER_METADATA_KEY } from './decorators/task-handler.decorator';
import {
  HandlerNotFoundError,
  TaskNotFoundError,
} from './task-scheduler.errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TaskConstructor = new (...args: any[]) => AbstractTask<unknown>;

@Injectable()
export class TaskDiscoveryService implements OnModuleInit {
  private readonly handlerMap = new Map<
    TaskConstructor,
    AbstractTaskHandler<AbstractTask<unknown>>
  >();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector
  ) {}

  onModuleInit(): void {
    const taskClasses = this.discoverTaskClasses();
    const handlerPairs = this.discoverHandlerPairs();

    this.validateAndBuildMap(taskClasses, handlerPairs);
  }

  getHandler(
    taskClass: TaskConstructor
  ): AbstractTaskHandler<AbstractTask<unknown>> {
    const handler = this.handlerMap.get(taskClass);
    if (!handler) {
      throw new HandlerNotFoundError(taskClass.name);
    }
    return handler;
  }

  private discoverTaskClasses(): Set<TaskConstructor> {
    const providers = this.discoveryService.getProviders();
    const taskClasses = new Set<TaskConstructor>();

    for (const wrapper of providers) {
      if (!wrapper.metatype) continue;
      const isTask = this.reflector.get(TASK_METADATA_KEY, wrapper.metatype);
      if (isTask) {
        taskClasses.add(wrapper.metatype as TaskConstructor);
      }
    }

    return taskClasses;
  }

  private discoverHandlerPairs(): Map<
    TaskConstructor,
    AbstractTaskHandler<AbstractTask<unknown>>
  > {
    const providers = this.discoveryService.getProviders();
    const pairs = new Map<
      TaskConstructor,
      AbstractTaskHandler<AbstractTask<unknown>>
    >();

    for (const wrapper of providers) {
      const taskClass = this.getTaskClassFromHandler(wrapper);
      if (taskClass && wrapper.instance) {
        pairs.set(
          taskClass,
          wrapper.instance as AbstractTaskHandler<AbstractTask<unknown>>
        );
      }
    }

    return pairs;
  }

  private getTaskClassFromHandler(
    wrapper: InstanceWrapper
  ): TaskConstructor | null {
    if (!wrapper.metatype) return null;

    const taskClass = this.reflector.get<TaskConstructor>(
      TASK_HANDLER_METADATA_KEY,
      wrapper.metatype
    );

    return taskClass ?? null;
  }

  private validateAndBuildMap(
    taskClasses: Set<TaskConstructor>,
    handlerPairs: Map<
      TaskConstructor,
      AbstractTaskHandler<AbstractTask<unknown>>
    >
  ): void {
    for (const [taskClass] of handlerPairs) {
      if (!taskClasses.has(taskClass)) {
        throw new TaskNotFoundError(taskClass.name);
      }
    }

    for (const taskClass of taskClasses) {
      if (!handlerPairs.has(taskClass)) {
        throw new HandlerNotFoundError(taskClass.name);
      }
    }

    for (const [taskClass, handler] of handlerPairs) {
      this.handlerMap.set(taskClass, handler);
    }
  }
}
