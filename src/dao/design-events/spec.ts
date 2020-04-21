import uuid from 'node-uuid';
import Knex from 'knex';

import { sandbox, test, Test } from '../../test-helpers/fresh';
import generateBid from '../../test-helpers/factories/bid';
import createUser from '../../test-helpers/create-user';
import DesignEvent from '../../domain-objects/design-event';
import { create as createDesign } from '../../components/product-designs/dao';
import {
  create,
  createAll,
  DuplicateAcceptRejectError,
  findApprovalStepEvents,
  findByDesignId,
  findByTargetId,
  isQuoteCommitted
} from './index';
import db from '../../services/db';
import generateDesignEvent from '../../test-helpers/factories/design-event';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import { generateDesign } from '../../test-helpers/factories/product-design';

const testDate = new Date(2012, 11, 22);
test('Design Events DAO supports creation', async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const { user: partner } = await createUser();
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const inputEvent: DesignEvent = {
    actorId: cala.id,
    approvalStepId: null,
    bidId: bid.id,
    createdAt: testDate,
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };
  const designEvent = await create(inputEvent);

  t.deepEqual(inputEvent, designEvent);
});

test('Design Events DAO supports creating multiple events at once', async (t: Test) => {
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const { user: partner } = await createUser();
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const submitEvent: DesignEvent = {
    actorId: designer.id,
    approvalStepId: null,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    type: 'SUBMIT_DESIGN'
  };
  const bidEvent: DesignEvent = {
    actorId: cala.id,
    approvalStepId: null,
    bidId: bid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };
  const acceptBidEvent: DesignEvent = {
    actorId: partner.id,
    approvalStepId: null,
    bidId: bidEvent.bidId,
    createdAt: new Date(2012, 11, 25),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    type: 'ACCEPT_SERVICE_BID'
  };
  const created = await createAll([bidEvent, submitEvent, acceptBidEvent]);

  t.deepEqual(created, [submitEvent, bidEvent, acceptBidEvent]);
});

test('Design Events DAO supports retrieval by design ID', async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const { user: partner } = await createUser();
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const inputEvent: DesignEvent = {
    actorId: cala.id,
    approvalStepId: null,
    bidId: bid.id,
    createdAt: testDate,
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };
  await create(inputEvent);
  const partnerEvents = await findByTargetId(partner.id);
  const designerEvents = await findByTargetId(designer.id);

  t.deepEqual(partnerEvents, [inputEvent]);
  t.deepEqual(designerEvents, []);
});

test('Design Events DAO supports retrieval by target ID', async (t: Test) => {
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const { user: partner } = await createUser();
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const submitEvent: DesignEvent = {
    actorId: designer.id,
    approvalStepId: null,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    type: 'SUBMIT_DESIGN'
  };
  const bidEvent: DesignEvent = {
    actorId: cala.id,
    approvalStepId: null,
    bidId: bid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };
  const acceptBidEvent: DesignEvent = {
    actorId: partner.id,
    approvalStepId: null,
    bidId: bidEvent.bidId,
    createdAt: new Date(2012, 11, 25),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    type: 'ACCEPT_SERVICE_BID'
  };
  await createAll([bidEvent, submitEvent, acceptBidEvent]);
  const designEvents = await findByDesignId(design.id);

  t.deepEqual(
    designEvents,
    [submitEvent, bidEvent, acceptBidEvent],
    'returns the events in createdAt order'
  );
});

test('isQuoteCommitted returns the correct value', async (t: Test) => {
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const { user: partner } = await createUser();
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const submitEvent: DesignEvent = {
    actorId: designer.id,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    approvalStepId: null,
    type: 'SUBMIT_DESIGN'
  };
  const bidEvent: DesignEvent = {
    actorId: cala.id,
    bidId: bid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    approvalStepId: null,
    type: 'BID_DESIGN'
  };
  const acceptBidEvent: DesignEvent = {
    actorId: partner.id,
    bidId: bidEvent.bidId,
    createdAt: new Date(2012, 11, 25),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    approvalStepId: null,
    type: 'ACCEPT_SERVICE_BID'
  };
  await createAll([bidEvent, submitEvent, acceptBidEvent]);

  t.false(await isQuoteCommitted(design.id));

  const commitQuoteEvent: DesignEvent = {
    actorId: designer.id,
    bidId: null,
    createdAt: new Date(2012, 11, 26),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    approvalStepId: null,
    type: 'COMMIT_QUOTE'
  };
  await create(commitQuoteEvent);

  t.true(await isQuoteCommitted(design.id));
});

test('DesignEventsDAO.create throws if the same bid is accepted twice', async (t: Test) => {
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const { user: partner } = await createUser();
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const submitEvent: DesignEvent = {
    actorId: designer.id,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    approvalStepId: null,
    type: 'SUBMIT_DESIGN'
  };
  const bidEvent: DesignEvent = {
    actorId: cala.id,
    bidId: bid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    approvalStepId: null,
    type: 'BID_DESIGN'
  };
  const acceptBidEvent: DesignEvent = {
    actorId: partner.id,
    bidId: bidEvent.bidId,
    createdAt: new Date(2012, 11, 25),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    approvalStepId: null,
    type: 'ACCEPT_SERVICE_BID'
  };
  await createAll([bidEvent, submitEvent, acceptBidEvent]);

  try {
    await create({
      actorId: partner.id,
      bidId: bidEvent.bidId,
      createdAt: new Date(2012, 11, 26),
      designId: design.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: cala.id,
      approvalStepId: null,
      type: 'ACCEPT_SERVICE_BID'
    });

    throw new Error("Shouldn't get here");
  } catch (err) {
    t.true(err instanceof DuplicateAcceptRejectError);
    t.equal(err.message, 'This bid has already been accepted or rejected');
  }
});

test('Design Events DAO supports retrieval by design ID and approval step ID', async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  const { bid } = await generateBid();
  const { user: partner } = await createUser();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const design = await generateDesign({ userId: designer.id });

  const approvalStepId = (await db.transaction(async (trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, design.id)
  ))[0].id;

  await generateDesignEvent({
    actorId: designer.id,
    approvalStepId,
    designId: design.id,
    type: 'SUBMIT_DESIGN'
  });
  await generateDesignEvent({
    actorId: designer.id,
    designId: design.id,
    type: 'COMMIT_QUOTE'
  });
  await generateDesignEvent({
    actorId: cala.id,
    bidId: bid.id,
    designId: design.id,
    quoteId: null,
    targetId: partner.id,
    approvalStepId: null,
    type: 'BID_DESIGN'
  });

  const events = await findApprovalStepEvents(design.id, approvalStepId);
  t.equal(events.length, 3);
  t.deepEqual(
    {
      approvalStepId: events[0].approvalStepId,
      designId: events[0].designId,
      actorId: events[0].actorId,
      actorName: events[0].actorName,
      actorRole: events[0].actorRole
    },
    {
      approvalStepId,
      designId: design.id,
      actorId: designer.id,
      actorName: designer.name,
      actorRole: designer.role
    },
    'actor user info is appended'
  );

  t.deepEqual(
    {
      approvalStepId: events[1].approvalStepId,
      designId: events[1].designId
    },
    {
      approvalStepId: null,
      designId: design.id
    },
    'returns design events'
  );

  t.deepEqual(
    {
      approvalStepId: events[2].approvalStepId,
      designId: events[2].designId,
      actorId: events[2].actorId,
      actorName: events[2].actorName,
      actorRole: events[2].actorRole,
      actorEmail: events[2].actorEmail,
      targetId: events[2].targetId,
      targetName: events[2].targetName,
      targetRole: events[2].targetRole,
      targetEmail: events[2].targetEmail
    },
    {
      approvalStepId: null,
      designId: design.id,
      actorId: cala.id,
      actorName: cala.name,
      actorRole: cala.role,
      actorEmail: cala.email,
      targetId: partner.id,
      targetName: partner.name,
      targetRole: partner.role,
      targetEmail: partner.email
    },
    'actor and target user info is appended'
  );
});
