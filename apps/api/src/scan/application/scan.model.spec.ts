import { InvalidScanStateError } from './scan.errors';
import { Scan, ScanFailDetails, ScanStatus, Vulnerability } from './scan.model';

const createVulnerability = (
  overrides: Partial<Vulnerability> = {}
): Vulnerability => ({
  vulnerabilityId: 'CVE-2021-44906',
  pkgName: 'minimist',
  installedVersion: '1.2.5',
  fixedVersion: '1.2.6',
  severity: 'CRITICAL',
  title: 'minimist: prototype pollution',
  description: 'Prototype pollution vulnerability',
  ...overrides,
});

describe(Scan.name, () => {
  it('should create a scan with Queued status', () => {
    const scan = new Scan('https://github.com/owner/repo');
    const snapshot = scan.toSnapshot();

    expect(snapshot.id).toBeDefined();
    expect(snapshot.repositoryUrl).toBe('https://github.com/owner/repo');
    expect(snapshot.repositoryPath).toBeNull();
    expect(snapshot.status).toBe(ScanStatus.Queued);
    expect(snapshot.failDetails).toBeNull();
    expect(snapshot.criticalVulnerabilities).toBeNull();
  });

  describe('startScanning', () => {
    it('should transition from Queued to Scanning and set repositoryPath', () => {
      const scan = new Scan('https://github.com/owner/repo');

      scan.startScanning('/tmp/scans/123');

      const snapshot = scan.toSnapshot();
      expect(snapshot.status).toBe(ScanStatus.Scanning);
      expect(snapshot.repositoryPath).toBe('/tmp/scans/123');
    });

    it('should throw when scan is not in Queued status', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');

      expect(() => scan.startScanning('/tmp/scans/456')).toThrow(
        InvalidScanStateError
      );
    });

    it('should throw when scan is already Finished', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');
      scan.finish([]);

      expect(() => scan.startScanning('/tmp/scans/456')).toThrow(
        InvalidScanStateError
      );
    });

    it('should throw when scan is Failed', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.fail(new Error('something went wrong'));

      expect(() => scan.startScanning('/tmp/scans/456')).toThrow(
        InvalidScanStateError
      );
    });
  });

  describe('finish', () => {
    it('should transition from Scanning to Finished', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');

      scan.finish([]);

      expect(scan.toSnapshot().status).toBe(ScanStatus.Finished);
    });

    it('should set criticalVulnerabilities when vulnerabilities are provided', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');
      const vulnerabilities = [createVulnerability()];

      scan.finish(vulnerabilities);

      expect(scan.toSnapshot().criticalVulnerabilities).toEqual(
        vulnerabilities
      );
    });

    it('should set criticalVulnerabilities to null when no vulnerabilities', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');

      scan.finish([]);

      expect(scan.toSnapshot().criticalVulnerabilities).toBeNull();
    });

    it('should throw when scan is not in Scanning status', () => {
      const scan = new Scan('https://github.com/owner/repo');

      expect(() => scan.finish([])).toThrow(InvalidScanStateError);
    });

    it('should throw when scan is already Finished', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');
      scan.finish([]);

      expect(() => scan.finish([])).toThrow(InvalidScanStateError);
    });
  });

  describe('fail', () => {
    it('should transition to Failed from any status', () => {
      const scan = new Scan('https://github.com/owner/repo');
      const error = new Error('clone failed');

      scan.fail(error);

      const snapshot = scan.toSnapshot();
      expect(snapshot.status).toBe(ScanStatus.Failed);
      expect(snapshot.failDetails).toEqual({
        error,
        errorOnStatus: ScanStatus.Queued,
      });
    });

    it('should capture the status at which the failure occurred', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');
      const error = new Error('scan failed');

      scan.fail(error);

      expect(scan.toSnapshot().failDetails).toEqual({
        error,
        errorOnStatus: ScanStatus.Scanning,
      });
    });
  });

  describe('getRepositoryPath', () => {
    it('should return null before scanning starts', () => {
      const scan = new Scan('https://github.com/owner/repo');

      expect(scan.getRepositoryPath()).toBeNull();
    });

    it('should return repositoryPath after scanning starts', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');

      expect(scan.getRepositoryPath()).toBe('/tmp/scans/123');
    });
  });

  describe('reportPath', () => {
    it('should return null before report path is set', () => {
      const scan = new Scan('https://github.com/owner/repo');

      expect(scan.getReportPath()).toBeNull();
    });

    it('should set report path when scan is in Scanning state', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');

      scan.setReportPath('/tmp/scan-123.json');

      expect(scan.getReportPath()).toBe('/tmp/scan-123.json');
    });

    it('should throw when setting report path in Queued state', () => {
      const scan = new Scan('https://github.com/owner/repo');

      expect(() => scan.setReportPath('/tmp/scan-123.json')).toThrow(
        InvalidScanStateError
      );
    });

    it('should throw when setting report path in Finished state', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');
      scan.finish([]);

      expect(() => scan.setReportPath('/tmp/scan-123.json')).toThrow(
        InvalidScanStateError
      );
    });

    it('should throw when setting report path in Failed state', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.fail(new Error('failed'));

      expect(() => scan.setReportPath('/tmp/scan-123.json')).toThrow(
        InvalidScanStateError
      );
    });
  });

  describe('toSnapshot', () => {
    it('should return a readonly snapshot of the scan state', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');
      scan.finish([createVulnerability()]);

      const snapshot = scan.toSnapshot();

      expect(snapshot.id).toBe(scan.getId());
      expect(snapshot.repositoryUrl).toBe('https://github.com/owner/repo');
      expect(snapshot.repositoryPath).toBe('/tmp/scans/123');
      expect(snapshot.status).toBe(ScanStatus.Finished);
      expect(snapshot.criticalVulnerabilities).toHaveLength(1);
    });

    it('should not leak mutable references to criticalVulnerabilities', () => {
      const scan = new Scan('https://github.com/owner/repo');
      scan.startScanning('/tmp/scans/123');
      scan.finish([createVulnerability()]);

      const snapshot1 = scan.toSnapshot();
      snapshot1.criticalVulnerabilities![0]!.severity = 'LOW';

      const snapshot2 = scan.toSnapshot();
      expect(snapshot2.criticalVulnerabilities).toHaveLength(1);
      expect(snapshot2.criticalVulnerabilities?.[0]?.severity).toBe('CRITICAL');
    });

    it('should not leak mutable references to failDetails', () => {
      const scan = new Scan('https://github.com/owner/repo');
      const error = new Error('clone failed');
      scan.fail(error);

      const snapshot1 = scan.toSnapshot();
      (snapshot1.failDetails as ScanFailDetails).errorOnStatus =
        ScanStatus.Scanning;

      const snapshot2 = scan.toSnapshot();
      expect(snapshot2.failDetails!.errorOnStatus).toBe(ScanStatus.Queued);
    });
  });
});
