import { Vulnerability } from '../scan.model';

export abstract class ResultParser {
  abstract parse(reportPath: string): Promise<Vulnerability[]>;
}
