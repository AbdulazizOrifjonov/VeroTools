/** Console progress output for the seed CLI (independent of the API logger level). */
export class SeedLog {
  private started = Date.now();
  private stepStarted = Date.now();

  constructor(private readonly silent = false) {}

  private write(text: string) {
    if (!this.silent) process.stdout.write(text);
  }

  step(name: string) {
    this.stepStarted = Date.now();
    this.write(`  … ${name}\r`);
  }

  done(name: string, detail = '') {
    const ms = Date.now() - this.stepStarted;
    this.write(`  ✔ ${name}${detail ? ` — ${detail}` : ''}  (${(ms / 1000).toFixed(1)}s)\n`);
    this.stepStarted = Date.now();
  }

  skip(name: string, reason: string) {
    this.write(`  • ${name} — skipped: ${reason}\n`);
    this.stepStarted = Date.now();
  }

  info(text: string) {
    this.write(`${text}\n`);
  }

  total() {
    return ((Date.now() - this.started) / 1000).toFixed(1);
  }
}
