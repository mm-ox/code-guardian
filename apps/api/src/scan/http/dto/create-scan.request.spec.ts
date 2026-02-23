import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateScanRequest } from './create-scan.request';

function createRequest(repositoryUrl: string): CreateScanRequest {
  return plainToInstance(CreateScanRequest, { repositoryUrl });
}

describe('CreateScanRequest', () => {
  it('should accept a valid GitHub HTTPS URL', async () => {
    const errors = await validate(
      createRequest('https://github.com/owner/repo')
    );
    expect(errors).toHaveLength(0);
  });

  it('should accept a GitHub URL with .git suffix', async () => {
    const errors = await validate(
      createRequest('https://github.com/owner/repo.git')
    );
    expect(errors).toHaveLength(0);
  });

  it('should accept a GitHub URL with dots and hyphens', async () => {
    const errors = await validate(
      createRequest('https://github.com/my-org/my.repo-name')
    );
    expect(errors).toHaveLength(0);
  });

  it('should reject a non-GitHub URL', async () => {
    const errors = await validate(
      createRequest('https://gitlab.com/owner/repo')
    );
    expect(errors).toHaveLength(1);
  });

  it('should reject a file:// URL', async () => {
    const errors = await validate(createRequest('file:///etc/passwd'));
    expect(errors).toHaveLength(1);
  });

  it('should reject an SSH URL', async () => {
    const errors = await validate(createRequest('ssh://github.com/owner/repo'));
    expect(errors).toHaveLength(1);
  });

  it('should reject HTTP (non-HTTPS) GitHub URL', async () => {
    const errors = await validate(
      createRequest('http://github.com/owner/repo')
    );
    expect(errors).toHaveLength(1);
  });

  it('should reject a GitHub URL without owner/repo', async () => {
    const errors = await validate(createRequest('https://github.com/'));
    expect(errors).toHaveLength(1);
  });

  it('should reject a GitHub URL with path traversal', async () => {
    const errors = await validate(
      createRequest('https://github.com/../../../etc/passwd')
    );
    expect(errors).toHaveLength(1);
  });

  it('should reject an empty string', async () => {
    const errors = await validate(createRequest(''));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject an internal network URL', async () => {
    const errors = await validate(
      createRequest('https://internal-service:8080/admin')
    );
    expect(errors).toHaveLength(1);
  });
});
