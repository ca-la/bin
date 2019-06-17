import * as Knex from 'knex';
import * as process from 'process';

import * as db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';

decodeMimeTypes()
  .then(() => {
    log(`${green}Successfully updated all mime_types in the images table.`);
    process.exit();
  })
  .catch(
    (error: any): void => {
      log(`${red}ERROR:\n${reset}`, error);
      process.exit(1);
    }
  );

async function decodeMimeTypes(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const mimeTypes = (await trx('images').distinct('mime_type')) as {
      mime_type: string;
    }[];

    for (const mimeType of mimeTypes) {
      const decodedType = decodeURIComponent(mimeType.mime_type);
      log(`Updating mime_type "${mimeType.mime_type}" to "${decodedType}".`);
      await trx('images')
        .update({ mime_type: decodedType })
        .where({ mime_type: mimeType.mime_type });
    }
  });
}
