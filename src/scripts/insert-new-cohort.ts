import * as process from 'process';
import * as uuid from 'node-uuid';
import { CALA_OPS_USER_ID } from '../config';
import { log } from '../services/logger';
import { green, red, reset } from '../services/colors';

import Cohort from '../components/cohorts/domain-object';
import * as CohortsDAO from '../components/cohorts/dao';

insertNewCohort()
  .then(() => {
    log(`${green}Successfully inserted!`);
    process.exit();
  })
  .catch((err: any): void => {
    log(`${red}ERROR:\n${reset}`, err);
    process.exit(1);
  });

async function insertNewCohort(): Promise<void> {
  const newCohort: Cohort = {
    createdAt: new Date(),
    createdBy: CALA_OPS_USER_ID,
    description: 'Parsons x CALA Poncho graduation project',
    id: uuid.v4(),
    slug: 'parsons-q1-2019',
    title: 'Parsons Q1 2019'
  };
  const inserted = await CohortsDAO.create(newCohort);

  log(`${reset}Inserted:
${JSON.stringify(inserted, null, 2)}
`);
}
