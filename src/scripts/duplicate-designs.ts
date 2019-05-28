import * as process from 'process';

import { log, logServerError } from '../services/logger';
import { green, reset } from '../services/colors';
import { duplicateDesigns } from '../services/duplicate';

run()
  .then(() => {
    log(`${green}Successfully duplicated!`);
    process.exit();
  })
  .catch(
    (err: any): void => {
      logServerError(err);
      process.exit(1);
    }
  );

async function run(): Promise<void> {
  const userId = process.argv[2];
  const designIds = process.argv.slice(3);

  if (!userId || designIds.length < 1) {
    throw new Error(
      'Usage: duplicate-designs.ts [userId] [designId] [designId2]...'
    );
  }

  const duplicated = await duplicateDesigns(userId, designIds);

  log(`${reset}Duplicated:
${JSON.stringify(duplicated, null, 2)}
`);
}
