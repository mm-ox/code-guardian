import { AbstractTaskHandler } from '../../../task-scheduler/abstract-task-handler';
import { TaskHandler } from '../../../task-scheduler/decorators/task-handler.decorator';
import { ScanService } from '../scan.service';
import { CleanUpRepoTask } from '../task/clean-up-repo.task';

@TaskHandler(CleanUpRepoTask)
export class CleanUpRepoTaskHandler extends AbstractTaskHandler<CleanUpRepoTask> {
  constructor(private readonly scanService: ScanService) {
    super();
  }

  async handle(task: CleanUpRepoTask): Promise<void> {
    const { scanId } = task.data;

    await this.scanService.cleanUpRepository(scanId);
  }
}
