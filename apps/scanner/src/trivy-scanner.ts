import { spawn, spawnSync } from 'child_process';
import { copyFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { homedir, tmpdir } from 'os';
import { join } from 'path';

export interface ScanRequest {
  repositoryPath: string;
  reportPath: string;
}

function isTrivyInstalled(): boolean {
  const result = spawnSync('which', ['trivy']);
  return result.status === 0;
}

function buildTrivyCommand(
  tmpFile: string,
  repositoryPath: string
): { command: string; args: string[] } {
  if (isTrivyInstalled()) {
    return {
      command: 'trivy',
      args: ['fs', '--format', 'json', '--output', tmpFile, repositoryPath],
    };
  }

  const tmpDir = tmpdir();
  const trivyCacheDir = join(homedir(), '.cache/trivy');

  return {
    command: 'docker',
    args: [
      'run',
      '--rm',
      '--user',
      `${process.getuid!()}:${process.getgid!()}`,
      '-v',
      `${repositoryPath}:${repositoryPath}:ro`,
      '-v',
      `${tmpDir}:${tmpDir}`,
      '-v',
      `${trivyCacheDir}:${trivyCacheDir}`,
      '-e',
      `TRIVY_CACHE_DIR=${trivyCacheDir}`,
      'aquasec/trivy:latest',
      'fs',
      '--format',
      'json',
      '--output',
      tmpFile,
      repositoryPath,
    ],
  };
}

export function runTrivyScan(request: ScanRequest): void {
  const { repositoryPath, reportPath } = request;
  const tmpFile = join(tmpdir(), `${randomUUID()}.tmp`);

  const { command, args } = buildTrivyCommand(tmpFile, repositoryPath);

  console.log(`Running scan: ${command} ${args.join(' ')}`);

  const childProcess = spawn(command, args);

  let stderr = '';

  childProcess.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  childProcess.on('close', (code) => {
    if (code === 0) {
      copyFile(tmpFile, reportPath)
        .then(() => unlink(tmpFile))
        .catch((error) => {
          console.error(`Failed to move ${tmpFile} to ${reportPath}:`, error);
        });
    } else {
      console.error(`Trivy exited with code ${code}: ${stderr}`);
    }
  });

  childProcess.on('error', (error) => {
    console.error('Failed to spawn trivy:', error);
  });
}
