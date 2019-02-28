import * as process from 'process';
import * as Knex from 'knex';

import { log, logServerError } from '../../services/logger';
import { green, reset } from '../../services/colors';
import * as db from '../../services/db';
import * as CollaboratorsDAO from '../../components/collaborators/dao';

const LAUNCH_DATE = new Date(2018, 10, 1);

interface SparseDesign {
  id: string;
  title: string;
  user_id: string;
}

run()
  .then(() => {
    process.exit();
  })
  .catch((err: any): void => {
    logServerError(err);
    process.exit(1);
  });

async function run(): Promise<void> {
  const designsMissingDesigner: SparseDesign[] = await db('product_designs')
    .select([
      'product_designs.id',
      'product_designs.title',
      'product_designs.user_id'
    ])
    .leftJoin('collaborators', (join: Knex.JoinClause) => {
      join
        .on('collaborators.user_id', '=', 'product_designs.user_id')
        .andOn('collaborators.design_id', '=', 'product_designs.id');
    })
    .where('collaborators.user_id', null)
    .andWhere('product_designs.created_at', '>', LAUNCH_DATE);

  log(`${reset}Found ${designsMissingDesigner.length} designs:

${
  designsMissingDesigner
    .map((design: SparseDesign) => `${design.id} >> ${design.title}`)
    .join('\n')
}
`);

  for (const design of designsMissingDesigner) {
    await CollaboratorsDAO.create({
      collectionId: null,
      designId: design.id,
      invitationMessage: '',
      role: 'EDIT',
      userEmail: null,
      userId: design.user_id
    });
    log(`${green}- Made collaborator for "${design.title}"`);
  }
}
