import { AbstractTask } from '../../../task-scheduler/abstract-task';
import { Task } from '../../../task-scheduler/decorators/task.decorator';

export interface StartScanningData {
  scanId: string;
}

@Task()
export class StartScanningTask extends AbstractTask<StartScanningData> {}
