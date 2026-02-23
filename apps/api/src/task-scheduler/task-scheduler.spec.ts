import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AbstractTask, TaskStatus } from './abstract-task';
import { AbstractTaskHandler } from './abstract-task-handler';
import { Task } from './decorators/task.decorator';
import { TaskHandler } from './decorators/task-handler.decorator';
import { TaskScheduler } from './task-scheduler.service';
import { TaskSchedulerModule } from './task-scheduler.module';
import {
  HandlerNotFoundError,
  TaskNotFoundError,
} from './task-scheduler.errors';

interface TestPayload {
  value: string;
}

@Task()
class TestTask extends AbstractTask<TestPayload> {}

@TaskHandler(TestTask)
class TestTaskHandler extends AbstractTaskHandler<TestTask> {
  readonly calls: TestTask[] = [];

  async handle(task: TestTask): Promise<void> {
    this.calls.push(task);
  }
}

@Task()
class FailingTask extends AbstractTask<TestPayload> {}

@TaskHandler(FailingTask)
class FailingTaskHandler extends AbstractTaskHandler<FailingTask> {
  async handle(): Promise<void> {
    throw new Error('Task execution failed');
  }
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function createTestModule() {
  @Module({
    imports: [TaskSchedulerModule],
    providers: [TestTask, TestTaskHandler, FailingTask, FailingTaskHandler],
  })
  class TestModule {}

  const module = await Test.createTestingModule({
    imports: [TestModule],
  }).compile();

  await module.init();
  return module;
}

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;
  let handler: TestTaskHandler;

  beforeEach(async () => {
    const module = await createTestModule();
    scheduler = module.get(TaskScheduler);
    handler = module.get(TestTaskHandler);
  });

  it('should schedule a task and invoke the handler', async () => {
    const task = scheduler.schedule(new TestTask({ value: 'hello' }));

    expect(task).toBeInstanceOf(TestTask);
    expect(task.data).toEqual({ value: 'hello' });
    expect(task.id).toBeDefined();

    await flushPromises();

    expect(handler.calls).toHaveLength(1);
    expect(handler.calls[0]).toBe(task);
    expect(task.status).toBe(TaskStatus.Completed);
  });

  it('should set task status to Failed when handler throws', async () => {
    const task = scheduler.schedule(new FailingTask({ value: 'fail' }));

    await flushPromises();

    expect(task.status).toBe(TaskStatus.Failed);
    expect(task.error).toBe('Task execution failed');
  });

  it('should set task status to Running immediately after schedule', () => {
    const task = scheduler.schedule(new TestTask({ value: 'running' }));

    expect(task.status).toBe(TaskStatus.Running);
  });

  it('should retrieve a scheduled task by id', () => {
    const task = scheduler.schedule(new TestTask({ value: 'find-me' }));

    const found = scheduler.getTask(task.id);

    expect(found).toBe(task);
  });

  it('should return null for unknown task id', () => {
    const found = scheduler.getTask('non-existent-id');

    expect(found).toBeNull();
  });

  it('should assign unique ids to each task', () => {
    const task1 = scheduler.schedule(new TestTask({ value: 'a' }));
    const task2 = scheduler.schedule(new TestTask({ value: 'b' }));

    expect(task1.id).not.toBe(task2.id);
  });
});

describe('TaskScheduler validation errors', () => {
  it('should throw HandlerNotFoundError when a task has no handler', async () => {
    @Task()
    class OrphanTask extends AbstractTask<string> {}

    @Module({
      imports: [TaskSchedulerModule],
      providers: [OrphanTask],
    })
    class BrokenModule {}

    const compiled = await Test.createTestingModule({
      imports: [BrokenModule],
    }).compile();

    await expect(compiled.init()).rejects.toThrow(HandlerNotFoundError);
  });

  it('should throw TaskNotFoundError when a handler references an undecorated task', async () => {
    class UndecoratedTask extends AbstractTask<string> {}

    @TaskHandler(UndecoratedTask)
    class BadHandler extends AbstractTaskHandler<UndecoratedTask> {
      async handle(): Promise<void> {}
    }

    @Module({
      imports: [TaskSchedulerModule],
      providers: [BadHandler],
    })
    class BrokenModule {}

    const compiled = await Test.createTestingModule({
      imports: [BrokenModule],
    }).compile();

    await expect(compiled.init()).rejects.toThrow(TaskNotFoundError);
  });
});
