const API_BASE = 'http://localhost:3000';

const SCAN_STATUS = {
  Queued: 'Queued',
  Scanning: 'Scanning',
  Finished: 'Finished',
  Failed: 'Failed',
} as const;

type ScanStatus = (typeof SCAN_STATUS)[keyof typeof SCAN_STATUS];

export interface VulnerabilityResponse {
  vulnerabilityId: string;
  pkgName: string;
  installedVersion: string;
  fixedVersion: string | null;
  severity: string;
  title: string | null;
  description: string | null;
}

export interface ScanResponse {
  id: string;
  repositoryUrl: string;
  status: ScanStatus;
  criticalVulnerabilities: VulnerabilityResponse[] | null;
}

export async function createScan(repositoryUrl: string): Promise<ScanResponse> {
  const response = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repositoryUrl }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create scan: ${response.statusText}`);
  }

  return response.json();
}

export class ScanNotFoundError extends Error {
  constructor(scanId: string) {
    super(`Scan not found: ${scanId}`);
  }
}

export async function getScan(scanId: string): Promise<ScanResponse> {
  const response = await fetch(`${API_BASE}/api/scan/${scanId}`);

  if (response.status === 404) {
    throw new ScanNotFoundError(scanId);
  }

  if (!response.ok) {
    throw new Error(`Failed to get scan: ${response.statusText}`);
  }

  return response.json();
}
