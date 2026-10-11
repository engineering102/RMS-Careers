/**
 * Step recorder for end-to-end workflow reports. Every step ends as exactly one of:
 *   PASS | FAIL | BLOCKED (could not be attempted) | NOT IMPLEMENTED (feature absent in the app)
 * `run` converts a thrown assertion into FAIL so later independent steps are still assessed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { REPORT_ROOT } from './diagnostics';
import { redactText } from './redact';

export type StepStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT IMPLEMENTED';
export interface Step {
  n: number;
  name: string;
  status: StepStatus;
  detail: string;
}

export class Workflow {
  readonly steps: Step[] = [];
  constructor(private readonly suite: string, private readonly title: string) {}

  private add(name: string, status: StepStatus, detail: string): void {
    this.steps.push({ n: this.steps.length + 1, name, status, detail: redactText(detail, 400) });
  }

  /** Runs `fn`; a return string becomes the PASS detail, a throw becomes FAIL. Returns true on PASS. */
  async run(name: string, fn: () => Promise<string | void>): Promise<boolean> {
    try {
      this.add(name, 'PASS', (await fn()) ?? '');
      return true;
    } catch (error) {
      this.add(name, 'FAIL', error instanceof Error ? error.message.split('\n')[0] : 'unknown error');
      return false;
    }
  }
  blocked(name: string, reason: string): void {
    this.add(name, 'BLOCKED', reason);
  }
  notImplemented(name: string, reason: string): void {
    this.add(name, 'NOT IMPLEMENTED', reason);
  }
  failures(): Step[] {
    return this.steps.filter((s) => s.status === 'FAIL');
  }
  firstFailure(): Step | undefined {
    return this.failures()[0];
  }

  write(file: string): void {
    const dir = path.join(REPORT_ROOT, this.suite);
    mkdirSync(dir, { recursive: true });
    const lines = [`# ${this.title}`, '', '| # | Step | Status | Detail |', '|---|---|---|---|'];
    for (const s of this.steps) lines.push(`| ${s.n} | ${s.name} | ${s.status} | ${s.detail.replace(/\|/g, '/')} |`);
    writeFileSync(path.join(dir, file), lines.join('\n') + '\n');
  }
}
