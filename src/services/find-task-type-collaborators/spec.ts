import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import * as db from '../db';
import * as config from '../../config';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import createCollaborator from '../../test-helpers/factories/collaborator';
import createBid from '../../test-helpers/factories/bid';
import createCollectionDesign from '../../test-helpers/factories/collection-design';
import * as DesignEventsDAO from '../../dao/design-events';
import findTaskTypeCollaborators from '.';
import { taskTypes } from '../../components/tasks/templates/tasks';

test('findTaskTypeCollaborators', async (t: Test) => {
  const ops = await createUser({ role: 'ADMIN', withSession: false });
  const { user } = await createUser({ withSession: false });
  const partner = await createUser({ withSession: false });

  sandbox()
    .stub(config, 'CALA_OPS_USER_ID')
    .value(ops.user.id);

  const { collection, design } = await createCollectionDesign(user.id);
  const { bid, quote } = await createBid({
    designId: design.id,
    userId: ops.user.id
  });
  await DesignEventsDAO.create({
    id: uuid.v4(),
    type: 'ACCEPT_SERVICE_BID',
    createdAt: new Date(),
    actorId: partner.user.id,
    targetId: ops.user.id,
    designId: design.id,
    bidId: bid.id,
    quoteId: quote.id
  });

  const { collaborator: admin } = await createCollaborator({
    collectionId: collection.id,
    userId: ops.user.id
  });
  const { collaborator: designer } = await createCollaborator({
    designId: design.id,
    userId: user.id
  });
  const { collaborator: pairedPartner } = await createCollaborator({
    designId: design.id,
    userId: partner.user.id
  });

  return db.transaction(async (trx: Knex.Transaction) => {
    const byTaskType = await findTaskTypeCollaborators(design.id, trx);

    t.deepEqual(
      byTaskType[taskTypes.CALA.id]![0].id,
      admin.id,
      'Finds CALA ops user'
    );
    t.deepEqual(
      byTaskType[taskTypes.DESIGN.id]![0].id,
      designer.id,
      'Finds designer'
    );
    t.deepEqual(
      byTaskType[taskTypes.TECHNICAL_DESIGN.id]![0].id,
      pairedPartner.id,
      'Finds technical designer'
    );
    t.deepEqual(
      byTaskType[taskTypes.PRODUCTION.id]![0].id,
      pairedPartner.id,
      'Finds production partner'
    );
  });
});
