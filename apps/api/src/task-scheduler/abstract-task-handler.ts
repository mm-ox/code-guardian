import { AbstractTask } from './abstract-task';

export abstract class AbstractTaskHandler<TTask extends AbstractTask<unknown>> {
  abstract handle(task: TTask): Promise<void>;
}
