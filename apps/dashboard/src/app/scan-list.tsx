import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VulnerabilityModal } from './vulnerability-modal';
import type { ScanResponse, VulnerabilityResponse } from '@/api';

interface ScanListProps {
  scans: ScanResponse[];
}

function statusVariant(status: string) {
  switch (status) {
    case 'Finished':
      return 'default' as const;
    case 'Failed':
      return 'destructive' as const;
    case 'Scanning':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

export function ScanList({ scans }: ScanListProps) {
  const [modalVulnerabilities, setModalVulnerabilities] = useState<
    VulnerabilityResponse[] | null
  >(null);

  if (scans.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-12">
        No scans yet. Enter a GitHub repository URL above to start.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">Scan ID</TableHead>
            <TableHead>Repository</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.map((scan) => (
            <TableRow key={scan.id}>
              <TableCell className="font-mono text-xs">{scan.id}</TableCell>
              <TableCell>
                <a
                  href={scan.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 hover:opacity-80"
                >
                  {scan.repositoryUrl}
                </a>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(scan.status)}>
                  {scan.status}
                </Badge>
              </TableCell>
              <TableCell>
                {scan.status === 'Finished' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setModalVulnerabilities(
                        scan.criticalVulnerabilities ?? []
                      )
                    }
                  >
                    Results
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <VulnerabilityModal
        vulnerabilities={modalVulnerabilities ?? []}
        open={modalVulnerabilities !== null}
        onOpenChange={(open) => {
          if (!open) setModalVulnerabilities(null);
        }}
      />
    </>
  );
}
