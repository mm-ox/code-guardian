import { AbstractTaskHandler } from '../../../task-scheduler/abstract-task-handler';
import { TaskHandler } from '../../../task-scheduler/decorators/task-handler.decorator';
import { TaskScheduler } from '../../../task-scheduler/task-scheduler.service';
import { ScanService } from '../scan.service';
import { CloneRepositoryForScanTask } from '../task/clone-repository-for-scan.task';
import { StartScanningTask } from '../task/start-scanning.task';

@TaskHandler(CloneRepositoryForScanTask)
export class CloneRepositoryForScanTaskHandler extends AbstractTaskHandler<CloneRepositoryForScanTask> {
  constructor(
    private readonly scanService: ScanService,
    private readonly taskScheduler: TaskScheduler
  ) {
    super();
  }

  async handle(task: CloneRepositoryForScanTask): Promise<void> {
    const { scanId } = task.data;

    await this.scanService.cloneRepository(scanId);

    this.taskScheduler.schedule(
      new StartScanningTask({
        scanId,
      })
    );
  }
}
