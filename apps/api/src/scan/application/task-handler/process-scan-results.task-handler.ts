import { AbstractTaskHandler } from '../../../task-scheduler/abstract-task-handler';
import { TaskHandler } from '../../../task-scheduler/decorators/task-handler.decorator';
import { TaskScheduler } from '../../../task-scheduler/task-scheduler.service';
import { ScanService } from '../scan.service';
import { CleanUpRepoTask } from '../task/clean-up-repo.task';
import { ProcessScanResultsTask } from '../task/process-scan-results.task';

@TaskHandler(ProcessScanResultsTask)
export class ProcessScanResultsTaskHandler extends AbstractTaskHandler<ProcessScanResultsTask> {
  constructor(
    private readonly scanService: ScanService,
    private readonly taskScheduler: TaskScheduler
  ) {
    super();
  }

  async handle(task: ProcessScanResultsTask): Promise<void> {
    const { scanId } = task.data;

    await this.scanService.processScanResults(scanId);

    this.taskScheduler.schedule(
      new CleanUpRepoTask({
        scanId,
      })
    );
  }
}
