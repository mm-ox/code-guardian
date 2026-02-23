import { unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { generateTrivyReport } from '../src/scan/application/vulnerability-scanner/generate-trivy-report';
import { parseTrivyReport } from '../src/scan/application/vulnerability-scanner/parse-trivy-report';

const FIXTURE_PATH = join(tmpdir(), `stress-trivy-${randomUUID()}.json`);
const CRITICAL_COUNT = 15;
const TOTAL_COUNT = 1_000_000;

async function main() {
  console.log(
    `Generating ${TOTAL_COUNT} vulnerabilities (${CRITICAL_COUNT} critical)...`
  );
  const genStart = Date.now();
  await generateTrivyReport({
    outputPath: FIXTURE_PATH,
    criticalCount: CRITICAL_COUNT,
    totalCount: TOTAL_COUNT,
  });
  const fileSizeMB = (statSync(FIXTURE_PATH).size / 1024 / 1024).toFixed(1);
  console.log(
    `Generated in ${((Date.now() - genStart) / 1000).toFixed(
      1
    )}s (${fileSizeMB}MB)`
  );

  try {
    const before = process.memoryUsage();
    const start = Date.now();

    console.log(
      `Parsing with ${Math.round(before.heapUsed / 1024 / 1024)}MB heap used...`
    );

    const result = await parseTrivyReport(FIXTURE_PATH);

    const after = process.memoryUsage();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const peakHeap = Math.round(after.heapUsed / 1024 / 1024);

    console.log(`Parsed in ${elapsed}s, peak heap: ${peakHeap}MB`);
    console.log(`Found ${result.length} CRITICAL vulnerabilities`);

    if (result.length !== CRITICAL_COUNT) {
      console.error(`FAIL: expected ${CRITICAL_COUNT}, got ${result.length}`);
      process.exit(1);
    }

    for (const vuln of result) {
      if (vuln.severity !== 'CRITICAL') {
        console.error(
          `FAIL: non-CRITICAL vulnerability found: ${vuln.severity}`
        );
        process.exit(1);
      }
      if (!/^CVE-\d{4}-\d+$/.test(vuln.vulnerabilityId)) {
        console.error(`FAIL: invalid vulnerabilityId: ${vuln.vulnerabilityId}`);
        process.exit(1);
      }
    }

    console.log('PASS');
  } finally {
    unlinkSync(FIXTURE_PATH);
    console.log('Fixture cleaned up');
  }
}

main().catch((error) => {
  console.error('FAIL:', error);
  try {
    unlinkSync(FIXTURE_PATH);
  } catch {
    /* already removed */
  }
  process.exit(1);
});
