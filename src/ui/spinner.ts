import ora, { Ora } from 'ora';

export class SpinnerManager {
  private spinner: Ora | null = null;
  private isQuiet: boolean;

  constructor(isQuiet = false) {
    this.isQuiet = isQuiet;
  }

  start(text: string): void {
    if (this.isQuiet) return;
    this.spinner = ora(text).start();
  }

  succeed(text?: string): void {
    if (this.isQuiet) return;
    this.spinner?.succeed(text);
  }

  fail(text?: string): void {
    if (this.isQuiet) return;
    this.spinner?.fail(text);
  }

  warn(text: string): void {
    if (this.isQuiet) return;
    this.spinner?.warn(text);
  }

  info(text: string): void {
    if (this.isQuiet) return;
    this.spinner?.info(text);
  }

  update(text: string): void {
    if (this.isQuiet) return;
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  stop(): void {
    if (this.isQuiet) return;
    this.spinner?.stop();
  }
}
