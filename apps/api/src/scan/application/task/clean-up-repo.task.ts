import { AbstractTask } from '../../../task-scheduler/abstract-task';
import { Task } from '../../../task-scheduler/decorators/task.decorator';

export interface CleanUpRepoData {
  scanId: string;
}

@Task()
export class CleanUpRepoTask extends AbstractTask<CleanUpRepoData> {}
