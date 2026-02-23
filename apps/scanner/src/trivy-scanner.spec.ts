import { EventEmitter } from 'events';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
  spawnSync: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  copyFile: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
}));

import { spawn, spawnSync } from 'child_process';
import { copyFile, unlink } from 'fs/promises';
import { runTrivyScan } from './trivy-scanner';

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;
const mockCopyFile = copyFile as jest.MockedFunction<typeof copyFile>;
const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;

function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
  proc.stderr = new EventEmitter();
  return proc;
}

describe('runTrivyScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when trivy is installed', () => {
    beforeEach(() => {
      mockSpawnSync.mockReturnValue({ status: 0 } as never);
    });

    it('should spawn trivy directly with tmp file as output', () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      runTrivyScan({
        repositoryPath: '/tmp/scans/repo',
        reportPath: '/tmp/report.json',
      });

      expect(mockSpawn).toHaveBeenCalledWith('trivy', [
        'fs',
        '--format',
        'json',
        '--output',
        '/tmp/test-uuid-1234.tmp',
        '/tmp/scans/repo',
      ]);
    });

    it('should copy tmp file to report path on success', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);
      mockCopyFile.mockResolvedValue();
      mockUnlink.mockResolvedValue();

      runTrivyScan({
        repositoryPath: '/tmp/scans/repo',
        reportPath: '/tmp/report.json',
      });

      proc.emit('close', 0);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockCopyFile).toHaveBeenCalledWith(
        '/tmp/test-uuid-1234.tmp',
        '/tmp/report.json'
      );
    });

    it('should not copy when trivy exits with non-zero code', () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      runTrivyScan({
        repositoryPath: '/tmp/scans/repo',
        reportPath: '/tmp/report.json',
      });

      proc.stderr.emit('data', Buffer.from('some error'));
      proc.emit('close', 1);

      expect(mockCopyFile).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        'Trivy exited with code 1: some error'
      );
    });

    it('should log error when spawn fails', () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      runTrivyScan({
        repositoryPath: '/tmp/scans/repo',
        reportPath: '/tmp/report.json',
      });

      const error = new Error('spawn ENOENT');
      proc.emit('error', error);

      expect(console.error).toHaveBeenCalledWith(
        'Failed to spawn trivy:',
        error
      );
    });
  });

  describe('when trivy is not installed', () => {
    beforeEach(() => {
      mockSpawnSync.mockReturnValue({ status: 1 } as never);
    });

    it('should spawn docker with trivy image', () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      runTrivyScan({
        repositoryPath: '/tmp/scans/repo',
        reportPath: '/tmp/report.json',
      });

      expect(mockSpawn).toHaveBeenCalledWith('docker', [
        'run',
        '--rm',
        '--user',
        expect.stringMatching(/^\d+:\d+$/),
        '-v',
        '/tmp/scans/repo:/tmp/scans/repo:ro',
        '-v',
        '/tmp:/tmp',
        '-v',
        expect.stringMatching(/\.cache\/trivy.*\.cache\/trivy/),
        '-e',
        expect.stringMatching(/TRIVY_CACHE_DIR=.*\.cache\/trivy/),
        'aquasec/trivy:latest',
        'fs',
        '--format',
        'json',
        '--output',
        '/tmp/test-uuid-1234.tmp',
        '/tmp/scans/repo',
      ]);
    });

    it('should copy tmp file to report path on success', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);
      mockCopyFile.mockResolvedValue();
      mockUnlink.mockResolvedValue();

      runTrivyScan({
        repositoryPath: '/tmp/scans/repo',
        reportPath: '/tmp/report.json',
      });

      proc.emit('close', 0);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockCopyFile).toHaveBeenCalledWith(
        '/tmp/test-uuid-1234.tmp',
        '/tmp/report.json'
      );
    });
  });
});
