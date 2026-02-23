import { ScanStatus } from './scan.model';

export class ScanNotFoundError extends Error {
  constructor(scanId: string) {
    super(`Scan with id ${scanId} not found`);
    this.name = 'ScanNotFoundError';
  }
}

export class InvalidScanStateError extends Error {
  constructor(
    scanId: string,
    currentStatus: ScanStatus,
    expectedStatus: ScanStatus
  ) {
    super(
      `Scan ${scanId} is in "${currentStatus}" status, expected "${expectedStatus}"`
    );
    this.name = 'InvalidScanStateError';
  }
}

export class MissingRepositoryPathError extends Error {
  constructor(scanId: string) {
    super(`Scan ${scanId} has no repository path`);
    this.name = 'MissingRepositoryPathError';
  }
}

export class MissingReportPathError extends Error {
  constructor(scanId: string) {
    super(`Scan ${scanId} has no report path`);
    this.name = 'MissingReportPathError';
  }
}

export class ScannerServiceError extends Error {
  constructor(detail: string) {
    super(`Scanner service error: ${detail}`);
    this.name = 'ScannerServiceError';
  }
}

export class ScanTimeoutError extends Error {
  constructor(reportPath: string, timeoutMs: number) {
    super(
      `Scan timed out: report not found at ${reportPath} after ${timeoutMs}ms`
    );
    this.name = 'ScanTimeoutError';
  }
}
