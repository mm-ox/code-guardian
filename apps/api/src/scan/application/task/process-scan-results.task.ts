import { AbstractTask } from '../../../task-scheduler/abstract-task';
import { Task } from '../../../task-scheduler/decorators/task.decorator';

export interface ProcessScanResultsData {
  scanId: string;
}

@Task()
export class ProcessScanResultsTask extends AbstractTask<ProcessScanResultsData> {}
