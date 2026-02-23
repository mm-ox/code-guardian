import { Injectable } from '@nestjs/common';
import { Vulnerability } from '../scan.model';
import { parseTrivyReport } from '../vulnerability-scanner/parse-trivy-report';
import { ResultParser } from './result-parser';

@Injectable()
export class TrivyResultParser extends ResultParser {
  parse(reportPath: string): Promise<Vulnerability[]> {
    return parseTrivyReport(reportPath);
  }
}
