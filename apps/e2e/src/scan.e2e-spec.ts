import { execSync } from 'child_process';
import { setTimeout } from 'timers/promises';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';
const COMPOSE_PROJECT_DIR =
  process.env['COMPOSE_PROJECT_DIR'] ?? process.cwd() + '/../..';

const POLL_INTERVAL_MS = 5_000;
const SCAN_TIMEOUT_MS = 2 * 60 * 1000;
const READINESS_TIMEOUT_MS = 60_000;

interface WaitForOptions {
  retries: number;
  intervalMs: number;
}

async function waitFor<T>(
  action: () => Promise<T | null | undefined>,
  options: WaitForOptions
): Promise<T> {
  for (let i = 0; i < options.retries; i++) {
    const result = await action();
    if (result != null) return result;
    await setTimeout(options.intervalMs);
  }
  throw new Error(`waitFor exceeded ${options.retries} retries`);
}

async function createScan(repositoryUrl: string) {
  const res = await fetch(`${API_URL}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repositoryUrl }),
  });
  expect(res.status).toBe(201);
  return res.json();
}

describe('Scan E2E', () => {
  beforeAll(async () => {
    execSync('docker compose up -d --build', {
      cwd: COMPOSE_PROJECT_DIR,
      stdio: 'inherit',
    });
    await waitFor(
      async () => {
        try {
          const res = await fetch(`${API_URL}/api/scan/health-check`);
          return res.status < 500 ? true : null;
        } catch {
          return null;
        }
      },
      { retries: 60, intervalMs: 1_000 }
    );
  }, READINESS_TIMEOUT_MS + 30_000);

  afterAll(() => {
    execSync('docker compose down', {
      cwd: COMPOSE_PROJECT_DIR,
      stdio: 'inherit',
    });
  });

  it(
    'should scan OWASP/NodeGoat and return critical vulnerabilities',
    async () => {
      const scan = await createScan('https://github.com/OWASP/NodeGoat');
      expect(scan.status).toBe('Queued');

      const result = await waitFor(
        async () => {
          const pollRes = await fetch(`${API_URL}/api/scan/${scan.id}`);
          expect(pollRes.status).toBe(200);
          const pollData = await pollRes.json();
          if (pollData.status === 'Finished' || pollData.status === 'Failed') {
            return pollData;
          }
          return null;
        },
        {
          retries: Math.ceil(SCAN_TIMEOUT_MS / POLL_INTERVAL_MS),
          intervalMs: POLL_INTERVAL_MS,
        }
      );

      expect(result.status).toBe('Finished');
      expect(result.criticalVulnerabilities.length).toBeGreaterThan(0);
    },
    SCAN_TIMEOUT_MS + 30_000
  );
});
