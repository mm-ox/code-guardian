import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createScan,
  getScan,
  ScanNotFoundError,
  type ScanResponse,
} from './api';

const STORAGE_KEY = 'code-guardian-scan-ids';
const POLL_INTERVAL_MS = 5000;

function loadScanIds(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
      return parsed;
    }
  } catch {
    /* corrupted data */
  }

  return [];
}

function saveScanIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function isTerminal(status: string): boolean {
  return status === 'Finished' || status === 'Failed';
}

export function useScans() {
  const [scans, setScans] = useState<ScanResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshScans = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    const notFoundIds: string[] = [];
    const results = await Promise.all(
      ids.map((id) =>
        getScan(id).catch((err) => {
          if (err instanceof ScanNotFoundError) notFoundIds.push(id);
          return null;
        })
      )
    );

    if (notFoundIds.length > 0) {
      const remaining = ids.filter((id) => !notFoundIds.includes(id));
      saveScanIds(remaining);
    }

    setScans(results.filter((r): r is ScanResponse => r !== null));
  }, []);

  useEffect(() => {
    const ids = loadScanIds();
    if (ids.length > 0) {
      refreshScans(ids);
    }
  }, [refreshScans]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setScans((current) => {
        const pendingIds = current
          .filter((s) => !isTerminal(s.status))
          .map((s) => s.id);

        if (pendingIds.length > 0) {
          const notFoundIds: string[] = [];
          Promise.all(
            pendingIds.map((id) =>
              getScan(id).catch((err) => {
                if (err instanceof ScanNotFoundError) notFoundIds.push(id);
                return null;
              })
            )
          ).then((updated) => {
            if (notFoundIds.length > 0) {
              const ids = loadScanIds().filter(
                (id) => !notFoundIds.includes(id)
              );
              saveScanIds(ids);
            }
            setScans((prev) =>
              prev
                .filter((scan) => !notFoundIds.includes(scan.id))
                .map((scan) => {
                  const fresh = updated.find(
                    (u): u is ScanResponse => u !== null && u.id === scan.id
                  );
                  return fresh ?? scan;
                })
            );
          });
        }

        return current;
      });
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const addScan = useCallback(async (repositoryUrl: string) => {
    setLoading(true);
    try {
      const scan = await createScan(repositoryUrl);
      const ids = loadScanIds();
      const updatedIds = [...ids, scan.id];
      saveScanIds(updatedIds);
      setScans((prev) => [...prev, scan]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { scans, addScan, loading };
}
