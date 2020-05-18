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
  findById,
  findByTargetId,
  isQuoteCommitted
} from './index';
import db from '../../services/db';
import generateDesignEvent from '../../test-helpers/factories/design-event';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import * as ApprovalSubmissionsDAO from '../../components/approval-step-submissions/dao';
import { generateDesign } from '../../test-helpers/factories/product-design';
import {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState
} from '../../components/approval-step-submissions/domain-object';
import { taskTypes } from '../../components/tasks/templates';

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
    type: 'BID_DESIGN',
    approvalSubmissionId: null,
    commentId: null
  };
  const designEvent = await db.transaction(async (trx: Knex.Transaction) =>
    create(trx, inputEvent)
  );

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
    type: 'SUBMIT_DESIGN',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'BID_DESIGN',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'ACCEPT_SERVICE_BID',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'BID_DESIGN',
    approvalSubmissionId: null,
    commentId: null
  };
  await db.transaction(async (trx: Knex.Transaction) => {
    await create(trx, inputEvent);
  });
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
    type: 'SUBMIT_DESIGN',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'BID_DESIGN',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'ACCEPT_SERVICE_BID',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'SUBMIT_DESIGN',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'BID_DESIGN',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'ACCEPT_SERVICE_BID',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'COMMIT_QUOTE',
    approvalSubmissionId: null,
    commentId: null
  };
  await db.transaction(async (trx: Knex.Transaction) => {
    await create(trx, commitQuoteEvent);
  });

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
    type: 'SUBMIT_DESIGN',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'BID_DESIGN',
    approvalSubmissionId: null,
    commentId: null
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
    type: 'ACCEPT_SERVICE_BID',
    approvalSubmissionId: null,
    commentId: null
  };
  await createAll([bidEvent, submitEvent, acceptBidEvent]);

  try {
    await db.transaction(async (trx: Knex.Transaction) => {
      await create(trx, {
        actorId: partner.id,
        bidId: bidEvent.bidId,
        commentId: null,
        createdAt: new Date(2012, 11, 26),
        designId: design.id,
        id: uuid.v4(),
        quoteId: null,
        targetId: cala.id,
        approvalStepId: null,
        approvalSubmissionId: null,
        type: 'ACCEPT_SERVICE_BID'
      });
    });

    throw new Error("Shouldn't get here");
  } catch (err) {
    t.true(err instanceof DuplicateAcceptRejectError);
    t.equal(err.message, 'This bid has already been accepted or rejected');
  }
});

test('Design Events DAO supports retrieval by design ID and approval step ID', async (t: Test) => {
  const clock = sandbox().useFakeTimers(testDate);
  const { bid } = await generateBid({
    bidOptions: {
      taskTypeIds: [taskTypes.TECHNICAL_DESIGN.id, taskTypes.PRODUCTION.id]
    }
  });
  const { user: partner } = await createUser();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const design = await generateDesign({ userId: designer.id });

  const approvalStepId = (await db.transaction(async (trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, design.id)
  ))[0].id;

  clock.setSystemTime(new Date(2020, 1, 24));
  await generateDesignEvent({
    actorId: designer.id,
    approvalStepId,
    designId: design.id,
    type: 'SUBMIT_DESIGN'
  });
  clock.setSystemTime(new Date(2020, 1, 25));
  await generateDesignEvent({
    actorId: designer.id,
    designId: design.id,
    type: 'COMMIT_QUOTE'
  });
  clock.setSystemTime(new Date(2020, 1, 26));
  await generateDesignEvent({
    actorId: cala.id,
    bidId: bid.id,
    designId: design.id,
    quoteId: null,
    targetId: partner.id,
    approvalStepId: null,
    type: 'BID_DESIGN'
  });
  clock.setSystemTime(new Date(2020, 1, 27));
  await generateDesignEvent({
    actorId: cala.id,
    bidId: bid.id,
    designId: design.id,
    quoteId: null,
    targetId: partner.id,
    approvalStepId: null,
    type: 'ACCEPT_SERVICE_BID'
  });

  const events = await db.transaction(async (trx: Knex.Transaction) =>
    findApprovalStepEvents(trx, design.id, approvalStepId)
  );

  t.equal(events.length, 3);
  t.deepEqual(
    {
      approvalStepId: events[0].approvalStepId,
      designId: events[0].designId,
      actorId: events[0].actorId,
      actorName: events[0].actorName,
      actorRole: events[0].actorRole,
      type: events[0].type
    },
    {
      approvalStepId,
      designId: design.id,
      actorId: designer.id,
      actorName: designer.name,
      actorRole: designer.role,
      type: 'SUBMIT_DESIGN'
    },
    'actor user info is appended'
  );

  t.deepEqual(
    {
      approvalStepId: events[1].approvalStepId,
      designId: events[1].designId,
      type: events[1].type
    },
    {
      approvalStepId: null,
      designId: design.id,
      type: 'COMMIT_QUOTE'
    },
    'returns design events'
  );

  t.deepEqual(
    {
      approvalStepId: events[2].approvalStepId,
      type: events[2].type,
      taskTypeIds: events[2].taskTypeIds,
      taskTypeTitles: events[2].taskTypeTitles
    },
    {
      approvalStepId: null,
      type: 'ACCEPT_SERVICE_BID',
      taskTypeIds: [taskTypes.TECHNICAL_DESIGN.id, taskTypes.PRODUCTION.id],
      taskTypeTitles: [
        taskTypes.TECHNICAL_DESIGN.title,
        taskTypes.PRODUCTION.title
      ]
    },
    'task type ids and names are appended for ACCEPT_SERVICE_BID'
  );
});

test('Design Events DAO supports retrieval by Id', async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const design = await generateDesign({ userId: designer.id });

  const approvalStepId = (await db.transaction(async (trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, design.id)
  ))[0].id;

  const approvalSubmissionId = (await db.transaction(
    async (trx: Knex.Transaction) =>
      ApprovalSubmissionsDAO.createAll(trx, [
        {
          id: uuid.v4(),
          stepId: approvalStepId,
          createdAt: new Date(),
          artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
          state: ApprovalStepSubmissionState.UNSUBMITTED,
          collaboratorId: null,
          title: 'Rubber Ducky'
        }
      ])
  ))[0].id;

  const { designEvent } = await generateDesignEvent({
    actorId: cala.id,
    bidId: bid.id,
    designId: design.id,
    quoteId: null,
    targetId: null,
    approvalStepId,
    approvalSubmissionId,
    type: 'STEP_SUMBISSION_APPROVAL'
  });

  const event = await db.transaction(async (trx: Knex.Transaction) =>
    findById(trx, designEvent.id)
  );

  t.deepEqual(
    {
      approvalStepId: event.approvalStepId,
      approvalSubmissionId: event.approvalSubmissionId,
      designId: event.designId,
      actorId: event.actorId,
      actorName: event.actorName,
      actorRole: event.actorRole,
      targetId: event.targetId,
      targetName: event.targetName,
      targetRole: event.targetRole,
      submissionTitle: event.submissionTitle,
      stepTitle: event.stepTitle
    },
    {
      approvalStepId,
      approvalSubmissionId,
      designId: design.id,
      actorId: cala.id,
      actorName: cala.name,
      actorRole: cala.role,
      targetId: null,
      targetName: null,
      targetRole: null,
      submissionTitle: 'Rubber Ducky',
      stepTitle: 'Checkout'
    },
    'meta is appended'
  );
});
