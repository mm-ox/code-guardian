import { AbstractTaskHandler } from '../../../task-scheduler/abstract-task-handler';
import { TaskHandler } from '../../../task-scheduler/decorators/task-handler.decorator';
import { TaskScheduler } from '../../../task-scheduler/task-scheduler.service';
import { ScanService } from '../scan.service';
import { ProcessScanResultsTask } from '../task/process-scan-results.task';
import { StartScanningTask } from '../task/start-scanning.task';

@TaskHandler(StartScanningTask)
export class StartScanningTaskHandler extends AbstractTaskHandler<StartScanningTask> {
  constructor(
    private readonly scanService: ScanService,
    private readonly taskScheduler: TaskScheduler
  ) {
    super();
  }

  async handle(task: StartScanningTask): Promise<void> {
    const { scanId } = task.data;

    await this.scanService.scan(scanId);

    this.taskScheduler.schedule(
      new ProcessScanResultsTask({
        scanId,
      })
    );
  }
}
