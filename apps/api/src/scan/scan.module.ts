import { Module } from '@nestjs/common';
import { TaskSchedulerModule } from '../task-scheduler/task-scheduler.module';
import { RepoCloner } from './application/repo-cloner/repo-cloner';
import { SimpleGitCloner } from './application/repo-cloner/simple-git-cloner';
import { ResultParser } from './application/result-parser/result-parser';
import { TrivyResultParser } from './application/result-parser/trivy-result-parser';
import { ScanService } from './application/scan.service';
import { TrivyScanner } from './application/vulnerability-scanner/trivy-scanner';
import { VulnerabilityScanner } from './application/vulnerability-scanner/vulnerability-scanner';
import { CleanUpRepoTaskHandler } from './application/task-handler/clean-up-repo.task-handler';
import { CloneRepositoryForScanTaskHandler } from './application/task-handler/clone-repository-for-scan.task-handler';
import { ProcessScanResultsTaskHandler } from './application/task-handler/process-scan-results.task-handler';
import { StartScanningTaskHandler } from './application/task-handler/start-scanning.task-handler';
import { CleanUpRepoTask } from './application/task/clean-up-repo.task';
import { CloneRepositoryForScanTask } from './application/task/clone-repository-for-scan.task';
import { ProcessScanResultsTask } from './application/task/process-scan-results.task';
import { StartScanningTask } from './application/task/start-scanning.task';
import { ScanController } from './http/scan.controller';

@Module({
  imports: [TaskSchedulerModule],
  controllers: [ScanController],
  providers: [
    ScanService,
    { provide: RepoCloner, useClass: SimpleGitCloner },
    { provide: VulnerabilityScanner, useClass: TrivyScanner },
    { provide: ResultParser, useClass: TrivyResultParser },
    CloneRepositoryForScanTask,
    CloneRepositoryForScanTaskHandler,
    StartScanningTask,
    StartScanningTaskHandler,
    ProcessScanResultsTask,
    ProcessScanResultsTaskHandler,
    CleanUpRepoTask,
    CleanUpRepoTaskHandler,
  ],
  exports: [ScanService],
})
export class ScanModule {}
