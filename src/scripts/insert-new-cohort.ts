import * as process from 'process';
import * as uuid from 'node-uuid';
import { CALA_OPS_USER_ID } from '../config';
import { log, logServerError } from '../services/logger';
import { green, reset } from '../services/colors';

import Cohort from '../components/cohorts/domain-object';
import * as CohortsDAO from '../components/cohorts/dao';

insertNewCohort()
  .then(() => {
    log(`${green}Successfully inserted!`);
    process.exit();
  })
  .catch(
    (err: any): void => {
      logServerError(err);
      process.exit(1);
    }
  );

async function insertNewCohort(): Promise<void> {
  const description = process.argv[2];
  const slug = process.argv[3];
  const title = process.argv[4];

  if (!description || !slug || !title) {
    throw new Error('Usage: insert-new-cohort.ts [description] [slug] [title]');
  }

  const newCohort: Cohort = {
    createdAt: new Date(),
    createdBy: CALA_OPS_USER_ID,
    description,
    id: uuid.v4(),
    slug,
    title
  };
  const inserted = await CohortsDAO.create(newCohort);

  log(`${reset}Inserted:
${JSON.stringify(inserted, null, 2)}
`);
}
