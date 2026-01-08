import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { t } from '../i18n/index.js';
import { runConfigWizard, SINGLE_REPO_TEMPLATE, MULTI_REPO_TEMPLATE } from '../multi/config-wizard.js';

interface InitOptions {
  multi?: boolean;
  template?: 'single' | 'multi';
  output?: string;
}

export async function runInitCommand(options: InitOptions) {
  try {
    if (options.template) {
      const template = options.template === 'multi' ? MULTI_REPO_TEMPLATE : SINGLE_REPO_TEMPLATE;
      const outputPath = options.output || `.openspec-stats.${options.template}.json`;

      writeFileSync(outputPath, JSON.stringify(template, null, 2));
      console.log(chalk.green(t('init.templateCreated', { path: outputPath })));
      console.log(chalk.gray(t('init.templateEdit')));
      return;
    }

    await runConfigWizard(options.multi || false);
  } catch (error) {
    console.error(chalk.red(t('error.prefix')), error);
    process.exit(1);
  }
}
