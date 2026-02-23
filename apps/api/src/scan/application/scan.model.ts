import { randomUUID } from 'crypto';
import { InvalidScanStateError } from './scan.errors';

export const ScanStatus = {
  Queued: 'Queued',
  Scanning: 'Scanning',
  Finished: 'Finished',
  Failed: 'Failed',
} as const;

export type ScanStatus = (typeof ScanStatus)[keyof typeof ScanStatus];

export interface Vulnerability {
  vulnerabilityId: string;
  pkgName: string;
  installedVersion: string;
  fixedVersion: string | null;
  severity: string;
  title: string | null;
  description: string | null;
}

export interface ScanFailDetails {
  errorOnStatus: ScanStatus;
  error: Error;
}

export interface ScanSnapshot {
  readonly id: string;
  readonly repositoryUrl: string;
  readonly repositoryPath: string | null;
  readonly status: ScanStatus;
  readonly failDetails: ScanFailDetails | null;
  readonly criticalVulnerabilities: readonly Vulnerability[] | null;
}

export class Scan {
  private readonly id: string;
  private readonly repositoryUrl: string;
  private repositoryPath: string | null;
  private reportPath: string | null;
  private status: ScanStatus;
  private failDetails: ScanFailDetails | null;
  private criticalVulnerabilities: Vulnerability[] | null;

  constructor(repositoryUrl: string) {
    this.id = randomUUID();
    this.repositoryUrl = repositoryUrl;
    this.repositoryPath = null;
    this.reportPath = null;
    this.status = ScanStatus.Queued;
    this.failDetails = null;
    this.criticalVulnerabilities = null;
  }

  getId(): string {
    return this.id;
  }

  getRepositoryUrl(): string {
    return this.repositoryUrl;
  }

  toSnapshot(): ScanSnapshot {
    return {
      id: this.id,
      repositoryUrl: this.repositoryUrl,
      repositoryPath: this.repositoryPath,
      status: this.status,
      failDetails: this.failDetails ? { ...this.failDetails } : null,
      criticalVulnerabilities:
        this.criticalVulnerabilities?.map((v) => ({ ...v })) ?? null,
    };
  }

  startScanning(repositoryPath: string): void {
    if (this.status !== ScanStatus.Queued) {
      throw new InvalidScanStateError(this.id, this.status, ScanStatus.Queued);
    }

    this.repositoryPath = repositoryPath;
    this.status = ScanStatus.Scanning;
  }

  finish(vulnerabilities: Vulnerability[]): void {
    if (this.status !== ScanStatus.Scanning) {
      throw new InvalidScanStateError(
        this.id,
        this.status,
        ScanStatus.Scanning
      );
    }

    this.applyCriticalVulnerabilities(vulnerabilities);
    this.status = ScanStatus.Finished;
  }

  fail(error: Error): void {
    this.failDetails = { error, errorOnStatus: this.status };
    this.status = ScanStatus.Failed;
  }

  getRepositoryPath(): string | null {
    return this.repositoryPath;
  }

  clearRepositoryPath(): void {
    this.repositoryPath = null;
  }

  setReportPath(reportPath: string): void {
    if (this.status !== ScanStatus.Scanning) {
      throw new InvalidScanStateError(
        this.id,
        this.status,
        ScanStatus.Scanning
      );
    }
    this.reportPath = reportPath;
  }

  getReportPath(): string | null {
    return this.reportPath;
  }

  private applyCriticalVulnerabilities(vulnerabilities: Vulnerability[]): void {
    this.criticalVulnerabilities =
      vulnerabilities.length > 0 ? vulnerabilities : null;
  }
}
