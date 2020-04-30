import Knex from 'knex';
import uuid from 'node-uuid';

import db from '../db';
import config from '../../config';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import createCollaborator from '../../test-helpers/factories/collaborator';
import createBid from '../../test-helpers/factories/bid';
import createCollectionDesign from '../../test-helpers/factories/collection-design';
import * as DesignEventsDAO from '../../dao/design-events';
import findTaskTypeCollaborators from '.';
import { taskTypes } from '../../components/tasks/templates';
import { CollaboratorRole } from '../../components/collaborators/domain-objects/role';

test('findTaskTypeCollaborators', async (t: Test) => {
  const ops = await createUser({ role: 'ADMIN', withSession: false });
  const { user } = await createUser({ withSession: false });
  const partner = await createUser({ withSession: false });
  const photographer = await createUser({ withSession: false });

  sandbox()
    .stub(config, 'CALA_OPS_USER_ID')
    .value(ops.user.id);

  const { collection, design } = await createCollectionDesign(user.id);
  const { bid, quote } = await createBid({
    designId: design.id,
    userId: ops.user.id,
    bidOptions: {
      taskTypeIds: [taskTypes.TECHNICAL_DESIGN.id, taskTypes.PRODUCTION.id]
    }
  });
  const { bid: photoBid } = await createBid({
    designId: design.id,
    quoteId: quote.id,
    userId: ops.user.id,
    bidOptions: {
      taskTypeIds: [taskTypes.PRODUCT_PHOTOGRAPHY.id]
    }
  });
  await db.transaction(async (trx: Knex.Transaction) => {
    await DesignEventsDAO.create(trx, {
      id: uuid.v4(),
      type: 'ACCEPT_SERVICE_BID',
      commentId: null,
      createdAt: new Date(),
      actorId: partner.user.id,
      targetId: ops.user.id,
      designId: design.id,
      bidId: bid.id,
      quoteId: quote.id,
      approvalStepId: null,
      approvalSubmissionId: null
    });
    await DesignEventsDAO.create(trx, {
      id: uuid.v4(),
      type: 'ACCEPT_SERVICE_BID',
      commentId: null,
      createdAt: new Date(),
      actorId: photographer.user.id,
      targetId: ops.user.id,
      designId: design.id,
      bidId: photoBid.id,
      quoteId: quote.id,
      approvalStepId: null,
      approvalSubmissionId: null
    });
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
    userId: partner.user.id,
    role: CollaboratorRole.PARTNER
  });
  const { collaborator: pairedPhotographer } = await createCollaborator({
    designId: design.id,
    userId: photographer.user.id,
    role: CollaboratorRole.PARTNER
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
    t.deepEqual(
      byTaskType[taskTypes.PRODUCT_PHOTOGRAPHY.id]![0].id,
      pairedPhotographer.id,
      'Finds photography partner'
    );
  });
});
