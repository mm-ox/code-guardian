import { ApiProperty } from '@nestjs/swagger';
import { ScanSnapshot, ScanStatus } from '../../application/scan.model';
import { VulnerabilityResponse } from './vulnerability.response';

export class ScanResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'https://github.com/owner/repo' })
  repositoryUrl: string;

  @ApiProperty({ enum: Object.values(ScanStatus), example: ScanStatus.Queued })
  status: ScanStatus;

  @ApiProperty({ type: [VulnerabilityResponse], nullable: true })
  criticalVulnerabilities: VulnerabilityResponse[] | null;

  constructor(scan: ScanSnapshot) {
    this.id = scan.id;
    this.repositoryUrl = scan.repositoryUrl;
    this.status = scan.status;
    this.criticalVulnerabilities = scan.criticalVulnerabilities
      ? [...scan.criticalVulnerabilities]
      : null;
  }
}
