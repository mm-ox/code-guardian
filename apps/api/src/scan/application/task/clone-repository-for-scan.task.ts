import { AbstractTask } from '../../../task-scheduler/abstract-task';
import { Task } from '../../../task-scheduler/decorators/task.decorator';

export interface CloneRepositoryForScanData {
  scanId: string;
}

@Task()
export class CloneRepositoryForScanTask extends AbstractTask<CloneRepositoryForScanData> {}
