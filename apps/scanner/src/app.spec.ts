import { type Server } from 'http';
import { runTrivyScan } from './trivy-scanner';
import { app } from './app';

jest.mock('./trivy-scanner');

const mockRunTrivyScan = runTrivyScan as jest.MockedFunction<
  typeof runTrivyScan
>;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://localhost:${address.port}`;
      }
      resolve();
    });
  });
});

afterAll((done) => {
  server.close(done);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /scan', () => {
  it('should return 200 immediately without waiting for scan', async () => {
    const response = await fetch(`${baseUrl}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryPath: '/tmp/scans/repo',
        reportPath: '/tmp/report.json',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
    expect(mockRunTrivyScan).toHaveBeenCalledWith({
      repositoryPath: '/tmp/scans/repo',
      reportPath: '/tmp/report.json',
    });
  });

  it('should return 400 when repositoryPath is missing', async () => {
    const response = await fetch(`${baseUrl}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportPath: '/tmp/report.json' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('repositoryPath and reportPath are required');
  });

  it('should return 400 when reportPath is missing', async () => {
    const response = await fetch(`${baseUrl}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositoryPath: '/tmp/scans/repo' }),
    });

    expect(response.status).toBe(400);
  });
});
