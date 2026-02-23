import { ScanService } from './scan.service';
import { RepoCloner } from './repo-cloner/repo-cloner';
import { VulnerabilityScanner } from './vulnerability-scanner/vulnerability-scanner';
import { ResultParser } from './result-parser/result-parser';
import { TaskScheduler } from '../../task-scheduler/task-scheduler.service';
import {
  ScanNotFoundError,
  MissingRepositoryPathError,
  MissingReportPathError,
} from './scan.errors';
import { ScanStatus, Vulnerability } from './scan.model';

const REPO_URL = 'https://github.com/owner/repo';
const REPORT_PATH = '/tmp/report-123.json';

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

function createMocks() {
  const repoCloner: jest.Mocked<RepoCloner> = {
    clone: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const vulnerabilityScanner: jest.Mocked<VulnerabilityScanner> = {
    scan: jest.fn().mockResolvedValue(REPORT_PATH),
  };

  const resultParser: jest.Mocked<ResultParser> = {
    parse: jest.fn().mockResolvedValue([]),
  };

  const taskScheduler: jest.Mocked<Pick<TaskScheduler, 'schedule'>> = {
    schedule: jest.fn(),
  };

  return { repoCloner, vulnerabilityScanner, resultParser, taskScheduler };
}

function createService(mocks = createMocks()) {
  const service = new ScanService(
    mocks.repoCloner,
    mocks.vulnerabilityScanner,
    mocks.resultParser,
    mocks.taskScheduler as unknown as TaskScheduler
  );
  return { service, ...mocks };
}

describe(ScanService.name, () => {
  describe('createScan', () => {
    it('should create a scan in Queued status and schedule a clone task', () => {
      const { service, taskScheduler } = createService();

      const scan = service.createScan(REPO_URL);

      expect(scan.toSnapshot().status).toBe(ScanStatus.Queued);
      expect(scan.toSnapshot().repositoryUrl).toBe(REPO_URL);
      expect(taskScheduler.schedule).toHaveBeenCalledTimes(1);
    });

    it('should make the scan retrievable by id', () => {
      const { service } = createService();

      const scan = service.createScan(REPO_URL);

      expect(service.findScan(scan.getId())).toBe(scan);
    });
  });

  describe('findScan', () => {
    it('should return null for unknown id', () => {
      const { service } = createService();

      expect(service.findScan('non-existent')).toBeNull();
    });
  });

  describe('cloneRepository', () => {
    it('should clone the repo and transition scan to Scanning', async () => {
      const { service, repoCloner } = createService();
      const scan = service.createScan(REPO_URL);

      await service.cloneRepository(scan.getId());

      expect(repoCloner.clone).toHaveBeenCalledWith(
        REPO_URL,
        `/tmp/scans/${scan.getId()}`
      );
      expect(scan.toSnapshot().status).toBe(ScanStatus.Scanning);
    });

    it('should fail the scan when cloning throws', async () => {
      const mocks = createMocks();

      mocks.repoCloner.clone.mockRejectedValue(new Error('network error'));

      const { service } = createService(mocks);
      const scan = service.createScan(REPO_URL);

      await expect(service.cloneRepository(scan.getId())).rejects.toThrow(
        'network error'
      );

      expect(scan.toSnapshot().status).toBe(ScanStatus.Failed);
    });

    it('should throw ScanNotFoundError for unknown scan', async () => {
      const { service } = createService();

      await expect(service.cloneRepository('unknown')).rejects.toThrow(
        ScanNotFoundError
      );
    });
  });

  describe('scan', () => {
    it('should run vulnerability scanner on cloned repository', async () => {
      const { service, vulnerabilityScanner } = createService();
      const scan = service.createScan(REPO_URL);

      await service.cloneRepository(scan.getId());

      await service.scan(scan.getId());

      expect(vulnerabilityScanner.scan).toHaveBeenCalledWith(
        scan.getId(),
        scan.getRepositoryPath()
      );
    });

    it('should fail the scan when scanner throws', async () => {
      const mocks = createMocks();

      mocks.vulnerabilityScanner.scan.mockRejectedValue(
        new Error('scanner crashed')
      );

      const { service } = createService(mocks);
      const scan = service.createScan(REPO_URL);

      await service.cloneRepository(scan.getId());

      await expect(service.scan(scan.getId())).rejects.toThrow(
        'scanner crashed'
      );

      expect(scan.toSnapshot().status).toBe(ScanStatus.Failed);
    });

    it('should throw MissingRepositoryPathError when repo was not cloned', async () => {
      const { service } = createService();
      const scan = service.createScan(REPO_URL);

      // force into Scanning without a real path
      scan.startScanning('/tmp/fake');
      scan.clearRepositoryPath();

      await expect(service.scan(scan.getId())).rejects.toThrow(
        MissingRepositoryPathError
      );
    });
  });

  describe('processScanResults', () => {
    it('should parse report and finish scan with vulnerabilities', async () => {
      const vulnerabilities = [createVulnerability()];
      const mocks = createMocks();

      mocks.resultParser.parse.mockResolvedValue(vulnerabilities);

      const { service } = createService(mocks);
      const scan = service.createScan(REPO_URL);

      await service.cloneRepository(scan.getId());
      await service.scan(scan.getId());

      await service.processScanResults(scan.getId());

      expect(scan.toSnapshot().status).toBe(ScanStatus.Finished);
      expect(scan.toSnapshot().criticalVulnerabilities).toEqual(
        vulnerabilities
      );
    });

    it('should finish with no vulnerabilities when report is empty', async () => {
      const { service } = createService();
      const scan = service.createScan(REPO_URL);

      await service.cloneRepository(scan.getId());
      await service.scan(scan.getId());

      await service.processScanResults(scan.getId());

      expect(scan.toSnapshot().status).toBe(ScanStatus.Finished);
      expect(scan.toSnapshot().criticalVulnerabilities).toBeNull();
    });

    it('should fail the scan when parsing throws', async () => {
      const mocks = createMocks();

      mocks.resultParser.parse.mockRejectedValue(new Error('corrupt report'));

      const { service } = createService(mocks);
      const scan = service.createScan(REPO_URL);

      await service.cloneRepository(scan.getId());
      await service.scan(scan.getId());

      await expect(service.processScanResults(scan.getId())).rejects.toThrow(
        'corrupt report'
      );

      expect(scan.toSnapshot().status).toBe(ScanStatus.Failed);
    });

    it('should throw MissingReportPathError when scan has no report', async () => {
      const { service } = createService();
      const scan = service.createScan(REPO_URL);

      await service.cloneRepository(scan.getId());
      // skip service.scan() so no report path is set

      await expect(service.processScanResults(scan.getId())).rejects.toThrow(
        MissingReportPathError
      );
    });
  });

  describe('cleanUpRepository', () => {
    it('should remove cloned repo and clear the path', async () => {
      const { service, repoCloner } = createService();
      const scan = service.createScan(REPO_URL);

      await service.cloneRepository(scan.getId());

      const repoPath = scan.getRepositoryPath();

      await service.cleanUpRepository(scan.getId());

      expect(repoCloner.remove).toHaveBeenCalledWith(repoPath);
      expect(scan.getRepositoryPath()).toBeNull();
    });

    it('should skip removal when there is no repository path', async () => {
      const { service, repoCloner } = createService();
      const scan = service.createScan(REPO_URL);

      await service.cloneRepository(scan.getId());

      scan.clearRepositoryPath();

      await service.cleanUpRepository(scan.getId());

      expect(repoCloner.remove).not.toHaveBeenCalled();
    });
  });

  describe('full scan flow', () => {
    it('should go from creation to finished with vulnerabilities', async () => {
      const vulnerabilities = [createVulnerability()];
      const mocks = createMocks();

      mocks.resultParser.parse.mockResolvedValue(vulnerabilities);

      const { service } = createService(mocks);

      const scan = service.createScan(REPO_URL);

      await service.cloneRepository(scan.getId());
      await service.scan(scan.getId());
      await service.processScanResults(scan.getId());
      await service.cleanUpRepository(scan.getId());

      const snapshot = scan.toSnapshot();

      expect(snapshot.status).toBe(ScanStatus.Finished);
      expect(snapshot.criticalVulnerabilities).toEqual(vulnerabilities);
      expect(snapshot.repositoryPath).toBeNull();
    });
  });
});
