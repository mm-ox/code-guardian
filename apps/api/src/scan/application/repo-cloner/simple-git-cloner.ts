import { Injectable, Logger } from '@nestjs/common';
import { simpleGit } from 'simple-git';
import { rm } from 'fs/promises';
import { resolve } from 'path';
import { RepoCloner } from './repo-cloner';

const SCANS_BASE_DIR = '/tmp/scans';
const CLONE_TIMEOUT_MS = 120_000;

@Injectable()
export class SimpleGitCloner extends RepoCloner {
  private readonly logger = new Logger(SimpleGitCloner.name);

  async clone(repositoryUrl: string, destinationPath: string): Promise<void> {
    this.logger.log(`Cloning ${repositoryUrl} to ${destinationPath}`);
    await simpleGit({ timeout: { block: CLONE_TIMEOUT_MS } }).clone(
      repositoryUrl,
      destinationPath,
      ['--depth', '1']
    );
  }

  async remove(repositoryPath: string): Promise<void> {
    this.assertPathWithinScansDir(repositoryPath);

    this.logger.log(`Removing repository at ${repositoryPath}`);
    await rm(repositoryPath, { recursive: true, force: true });
  }

  private assertPathWithinScansDir(repositoryPath: string): void {
    const resolved = resolve(repositoryPath);

    if (
      !resolved.startsWith(`${SCANS_BASE_DIR}/`) ||
      resolved === SCANS_BASE_DIR
    ) {
      throw new Error(
        `Refusing to delete path outside ${SCANS_BASE_DIR}: ${resolved}`
      );
    }
  }
}
