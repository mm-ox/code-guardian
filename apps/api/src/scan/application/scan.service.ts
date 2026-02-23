import { Injectable } from '@nestjs/common';
import { TaskScheduler } from '../../task-scheduler/task-scheduler.service';
import { RepoCloner } from './repo-cloner/repo-cloner';
import { ResultParser } from './result-parser/result-parser';
import {
  MissingReportPathError,
  MissingRepositoryPathError,
  ScanNotFoundError,
} from './scan.errors';
import { Scan } from './scan.model';
import { CloneRepositoryForScanTask } from './task/clone-repository-for-scan.task';
import { VulnerabilityScanner } from './vulnerability-scanner/vulnerability-scanner';

@Injectable()
export class ScanService {
  private readonly scans = new Map<string, Scan>();

  constructor(
    private readonly repoCloner: RepoCloner,
    private readonly vulnerabilityScanner: VulnerabilityScanner,
    private readonly resultParser: ResultParser,
    private readonly taskScheduler: TaskScheduler
  ) {}

  createScan(repositoryUrl: string): Scan {
    const scan = new Scan(repositoryUrl);
    this.scans.set(scan.getId(), scan);

    this.taskScheduler.schedule(
      new CloneRepositoryForScanTask({
        scanId: scan.getId(),
      })
    );

    return scan;
  }

  findScan(id: string): Scan | null {
    return this.scans.get(id) ?? null;
  }

  async cloneRepository(scanId: string): Promise<string> {
    const scan = this.getScanOrThrow(scanId);
    const repositoryPath = `/tmp/scans/${scanId}`;

    try {
      scan.startScanning(repositoryPath);

      await this.repoCloner.clone(scan.getRepositoryUrl(), repositoryPath);

      return repositoryPath;
    } catch (error) {
      scan.fail(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async scan(scanId: string): Promise<void> {
    const scan = this.getScanOrThrow(scanId);

    try {
      const repositoryPath = scan.getRepositoryPath();

      if (!repositoryPath) {
        throw new MissingRepositoryPathError(scanId);
      }

      const reportPath = await this.vulnerabilityScanner.scan(
        scanId,
        repositoryPath
      );
      scan.setReportPath(reportPath);
    } catch (error) {
      scan.fail(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async processScanResults(scanId: string): Promise<void> {
    const scan = this.getScanOrThrow(scanId);

    try {
      const reportPath = scan.getReportPath();

      if (!reportPath) {
        throw new MissingReportPathError(scanId);
      }

      const vulnerabilities = await this.resultParser.parse(reportPath);
      scan.finish(vulnerabilities);
    } catch (error) {
      scan.fail(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async cleanUpRepository(scanId: string): Promise<void> {
    const scan = this.getScanOrThrow(scanId);
    const repositoryPath = scan.getRepositoryPath();

    if (!repositoryPath) {
      return;
    }

    await this.repoCloner.remove(repositoryPath);
    scan.clearRepositoryPath();
  }

  private getScanOrThrow(scanId: string): Scan {
    const scan = this.scans.get(scanId);
    if (!scan) {
      throw new ScanNotFoundError(scanId);
    }
    return scan;
  }
}
