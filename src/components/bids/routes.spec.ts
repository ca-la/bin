import * as uuid from 'node-uuid';
import { omit } from 'lodash';
import * as sinon from 'sinon';

import DesignEvent from '../../domain-objects/design-event';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import { authHeader, del, get, post, put } from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');
import generateBid from '../../test-helpers/factories/bid';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import * as BidsDAO from './dao';
import * as BidRejectionDAO from '../bid-rejections/dao';
import * as PricingCostInputsDAO from '../pricing-cost-inputs/dao';
import * as CollaboratorsDAO from '../collaborators/dao';
import * as DesignEventsDAO from '../../dao/design-events';
import * as ProductDesignsDAO from '../product-designs/dao';
import * as NotificationsService from '../../services/create-notifications';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import generateDesignEvent from '../../test-helpers/factories/design-event';
import { daysToMs } from '../../services/time-conversion';

test('GET /bids', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const partner = await createUser({ role: 'PARTNER' });
  const other = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: admin.user.id
  });

  const { bid, quote } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: admin.user.id
  });
  const otherBid = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 100000,
    createdAt: new Date(2012, 11, 22),
    createdBy: admin.user.id,
    completedAt: null,
    description: 'Full Service',
    dueDate: new Date(new Date(2012, 11, 22).getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: []
  });

  await put(`/bids/${bid.id}/assignees/${partner.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  await put(`/bids/${otherBid.id}/assignees/${other.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  const [response, bids] = await get(`/bids?userId=${partner.user.id}`, {
    headers: authHeader(partner.session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(
    bids,
    [
      {
        ...bid,
        createdAt: bid.createdAt.toISOString(),
        design: {
          ...design,
          createdAt: design.createdAt.toISOString()
        },
        dueDate: bid.dueDate!.toISOString()
      }
    ],
    'returns only bids assigned to requested user'
  );
});

test('GET /bids as an admin fetching everything', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const findAllStub = sandbox()
    .stub(BidsDAO, 'findAll')
    .resolves([]);

  const [response, bids] = await get('/bids?limit=100&offset=50', {
    headers: authHeader(admin.session.id)
  });

  t.equal(response.status, 200, 'Successfully returns');
  t.deepEqual(bids, [], 'Successfully returns the stub list');
  t.equal(findAllStub.callCount, 1, 'Calls the findAll method exactly once');

  const [badResponse, badBody] = await get('/bids', {
    headers: authHeader(admin.session.id)
  });

  t.equal(badResponse.status, 400, 'Fails when a limit/offset is not passed');
  t.equal(
    badBody.message,
    'Must specify a limit and offset when fetching all bids!'
  );
});

test('GET /bids?userId&state=OPEN', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const partner = await createUser({ role: 'PARTNER' });
  const other = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: admin.user.id
  });

  const { bid, quote } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: admin.user.id
  });
  const otherBid = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 100000,
    createdAt: new Date(2012, 11, 22),
    createdBy: admin.user.id,
    completedAt: null,
    description: 'Full Service',
    dueDate: new Date(new Date(2012, 11, 22).getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: []
  });
  const expiredBid = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 100000,
    createdAt: new Date(2012, 11, 22),
    createdBy: admin.user.id,
    completedAt: null,
    description: 'Full Service',
    dueDate: new Date(new Date(2012, 11, 22).getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: []
  });

  await put(`/bids/${bid.id}/assignees/${partner.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  await put(`/bids/${expiredBid.id}/assignees/${partner.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  await put(`/bids/${otherBid.id}/assignees/${other.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  const [response, bids] = await get(
    `/bids?userId=${partner.user.id}&state=OPEN`,
    { headers: authHeader(partner.session.id) }
  );
  t.equal(response.status, 200);
  t.deepEqual(
    bids,
    [
      {
        ...bid,
        createdAt: bid.createdAt.toISOString(),
        design: {
          ...design,
          createdAt: design.createdAt.toISOString()
        },
        dueDate: bid.dueDate!.toISOString()
      }
    ],
    'returns only bids assigned to requested user'
  );
});

test('GET /bids?userId&state=EXPIRED', async (t: Test) => {
  const now = new Date(2012, 11, 22);
  sandbox().useFakeTimers(now);

  const admin = await createUser({ role: 'ADMIN' });
  const partner = await createUser({ role: 'PARTNER' });
  const other = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: admin.user.id
  });

  const { bid, quote } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: admin.user.id
  });
  const otherBid = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 100000,
    createdAt: now,
    createdBy: admin.user.id,
    completedAt: null,
    description: 'Full Service',
    dueDate: new Date(now.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: []
  });

  const threeDaysAgo = new Date(now.getTime() - daysToMs(3) - 1);
  sandbox().useFakeTimers(threeDaysAgo);
  const expiredBid = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 100000,
    createdAt: threeDaysAgo,
    createdBy: admin.user.id,
    completedAt: null,
    description: 'Full Service Brah',
    dueDate: new Date(threeDaysAgo.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: []
  });
  await generateDesignEvent({
    bidId: expiredBid.id,
    createdAt: threeDaysAgo,
    targetId: partner.user.id,
    type: 'BID_DESIGN'
  });

  sandbox().useFakeTimers(now);
  await put(`/bids/${bid.id}/assignees/${partner.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  await put(`/bids/${expiredBid.id}/assignees/${partner.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  await put(`/bids/${otherBid.id}/assignees/${other.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  const [response, bids] = await get(
    `/bids?userId=${partner.user.id}&state=EXPIRED`,
    { headers: authHeader(partner.session.id) }
  );
  t.equal(response.status, 200);
  t.deepEqual(
    bids,
    [
      {
        ...expiredBid,
        createdAt: expiredBid.createdAt.toISOString(),
        design: {
          ...design,
          createdAt: design.createdAt.toISOString()
        },
        dueDate: expiredBid.dueDate!.toISOString()
      }
    ],
    'returns only expired bid assigned to the user'
  );
});

test('GET /bids?userId&state=REJECTED', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const partner = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: admin.user.id
  });
  const { quote } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: admin.user.id
  });
  const otherBid = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 100000,
    createdAt: new Date(2012, 11, 22),
    createdBy: admin.user.id,
    completedAt: null,
    description: 'Full Service',
    dueDate: new Date(new Date(2012, 11, 22).getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: []
  });

  const bidsDaoStub = sandbox()
    .stub(BidsDAO, 'findRejectedByTargetId')
    .resolves([otherBid]);

  const [response, bids] = await get(
    `/bids?userId=${partner.user.id}&state=REJECTED`,
    { headers: authHeader(partner.session.id) }
  );
  t.equal(response.status, 200);
  t.deepEqual(
    bids,
    [
      {
        ...otherBid,
        createdAt: otherBid.createdAt.toISOString(),
        design: {
          ...design,
          createdAt: design.createdAt.toISOString()
        },
        dueDate: otherBid.dueDate!.toISOString()
      }
    ],
    'returns empty bids list'
  );
  t.equal(
    bidsDaoStub.callCount,
    1,
    'calls findRejectedByTargetId stub exactly once'
  );
});

test('GET /bids?userId&state=ACCEPTED', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const partner = await createUser({ role: 'PARTNER' });
  const other = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: admin.user.id
  });

  const { bid, quote } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: admin.user.id
  });
  const otherBid = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 100000,
    createdAt: new Date(2012, 11, 22),
    createdBy: admin.user.id,
    completedAt: null,
    description: 'Full Service',
    dueDate: new Date(new Date(2012, 11, 22).getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: []
  });

  await put(`/bids/${bid.id}/assignees/${partner.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  await put(`/bids/${otherBid.id}/assignees/${other.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  const [response, bids] = await get(
    `/bids?userId=${partner.user.id}&state=ACCEPTED`,
    { headers: authHeader(partner.session.id) }
  );
  t.equal(response.status, 200);
  t.deepEqual(bids, [], 'returns empty bids list');
});

test('PUT /bids/:bidId/assignees/:userId creates a new collaborator role', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const partner = await createUser({ role: 'PARTNER' });
  const designer = await createUser();
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: designer.user.id
  });
  const { bid } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: partner.user.id
  });

  const notificationStub = sandbox()
    .stub(NotificationsService, 'sendPartnerDesignBid')
    .resolves();

  const [response] = await put(`/bids/${bid.id}/assignees/${partner.user.id}`, {
    headers: authHeader(admin.session.id)
  });

  t.equal(response.status, 204, 'Successfully assigns first partner');
  t.equal(notificationStub.callCount, 1, 'Only calls notification once');

  const collaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    partner.user.id
  );

  if (!collaborator) {
    throw new Error('Could not find collaborators for the partner and design!');
  }

  t.equal(collaborator.role, 'PREVIEW', 'Creates a preview collaborator');
  t.equal(collaborator.userId, partner.user.id, 'Associates with the partner');
  t.true(
    collaborator.cancelledAt && collaborator.cancelledAt > new Date(),
    'Returns a cancelled date ahead of now'
  );

  const [failedResponse, failedBody] = await put(
    `/bids/${bid.id}/assignees/${partner.user.id}`,
    { headers: authHeader(admin.session.id) }
  );

  t.equal(failedResponse.status, 403, 'Fails to assign a bid again');
  t.true(failedBody.message.includes('There are active bids for user'));
});

test('PUT /bids/:bidId/assignees/:userId', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const collaborator = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });
  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: collaborator.user.id
  });

  const { bid } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: user.id
  });

  const notificationStub = sandbox()
    .stub(NotificationsService, 'sendPartnerDesignBid')
    .resolves();

  const [response] = await put(`/bids/${bid.id}/assignees/${user.id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 204, 'Successfully assigns first partner');
  sinon.assert.callCount(notificationStub, 1);

  const collaboratorAssignment = await put(
    `/bids/${bid.id}/assignees/${collaborator.user.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(
    collaboratorAssignment[0].status,
    204,
    'Successfully assigns second partner'
  );
  sinon.assert.callCount(notificationStub, 2);

  const [collaboratorResponse, collaborators] = await get(
    `/collaborators?designId=${design.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(collaboratorResponse.status, 200);
  t.equal(collaborators[0].userId, collaborator.user.id);
  t.equal(collaborators[0].role, 'EDIT', 'Keeps existing role');
  t.equal(collaborators[1].userId, user.id);

  const [notFoundUser] = await put(`/bids/${bid.id}/assignees/${uuid.v4()}`, {
    headers: authHeader(session.id)
  });
  t.equal(notFoundUser.status, 404);

  const [notFoundBid] = await put(`/bids/${uuid.v4()}/assignees/${user.id}`, {
    headers: authHeader(session.id)
  });
  t.equal(notFoundBid.status, 404);
});

test('GET /bids/:bidId/assignees', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const { user: partner } = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const { bid } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: user.id
  });

  await put(`/bids/${bid.id}/assignees/${partner.id}`, {
    headers: authHeader(session.id)
  });

  const [response, assignees] = await get(`/bids/${bid.id}/assignees`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.deepEqual(assignees, [
    {
      ...omit(partner, ['passwordHash']),
      createdAt: partner.createdAt.toISOString()
    }
  ]);
});

test('DELETE /bids/:bidId/assignees/:userId', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const { user: partner } = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const { bid } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: user.id
  });

  await put(`/bids/${bid.id}/assignees/${partner.id}`, {
    headers: authHeader(session.id)
  });
  const [response] = await del(`/bids/${bid.id}/assignees/${partner.id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 204);

  const assignees = await get(`/bids/${bid.id}/assignees`, {
    headers: authHeader(session.id)
  });
  t.deepEqual(assignees[1], []);

  const [collaboratorResponse, collaborators] = await get(
    `/collaborators?designId=${design.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(collaboratorResponse.status, 200);
  t.equal(
    collaborators.length,
    0,
    'Removes the partner collaborator for the design'
  );

  const events = await DesignEventsDAO.findByDesignId(design.id);

  t.equal(events.length, 2, 'Returns two events for the design');
  t.equal(events[0].type, 'BID_DESIGN');
  t.equal(events[0].bidId, bid.id);
  t.equal(events[1].type, 'REMOVE_PARTNER');
  t.equal(events[1].bidId, bid.id);
});

test('Partner pairing: accept', async (t: Test) => {
  await generatePricingValues();
  const admin = await createUser({ role: 'ADMIN' });
  const designer = await createUser();
  const partner = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: designer.user.id
  });
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    expiresAt: null,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });
  const quotesRequest = await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 300
      }
    ],
    headers: authHeader(admin.session.id)
  });
  const createdAt = new Date();
  const dueDate = new Date(createdAt.getTime() + daysToMs(10));
  const bid = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 20000,
    createdAt,
    createdBy: admin.user.id,
    completedAt: null,
    description: 'Do me a favor, please.',
    dueDate,
    id: uuid.v4(),
    quoteId: quotesRequest[1][0].id,
    taskTypeIds: []
  });
  await put(`/bids/${bid.id}/assignees/${partner.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  const notificationStub = sandbox()
    .stub(NotificationsService, 'sendPartnerAcceptServiceBidNotification')
    .resolves();

  const [missingBidResponse] = await post(`/bids/${uuid.v4()}/accept`, {
    headers: authHeader(partner.session.id)
  });
  t.equal(missingBidResponse.status, 404, 'Unknown bid returns 404');

  const [unauthorizedBidResponse] = await post(`/bids/${bid.id}/accept`, {
    headers: authHeader(designer.session.id)
  });
  t.equal(
    unauthorizedBidResponse.status,
    403,
    'Non-collaborator cannot accept bid'
  );

  const [response, body] = await post(`/bids/${bid.id}/accept`, {
    headers: authHeader(partner.session.id)
  });

  const designEvents = await DesignEventsDAO.findByDesignId(design.id);

  t.equal(
    response.status,
    200,
    'returns a 200 when successfully accepting a bid.'
  );
  t.deepEqual(
    body,
    {
      ...bid,
      createdAt: bid.createdAt.toISOString(),
      design: {
        ...design,
        createdAt: design.createdAt.toISOString()
      },
      dueDate: bid.dueDate!.toISOString()
    },
    'responds with the accepted bid and associated design.'
  );
  t.deepEqual(
    designEvents.map(
      (event: DesignEvent): any => ({
        actorId: event.actorId,
        designId: event.designId,
        type: event.type
      })
    ),
    [
      {
        actorId: admin.user.id,
        designId: design.id,
        type: 'COMMIT_QUOTE'
      },
      {
        actorId: admin.user.id,
        designId: design.id,
        type: 'BID_DESIGN'
      },
      {
        actorId: partner.user.id,
        designId: design.id,
        type: 'ACCEPT_SERVICE_BID'
      }
    ],
    'Adds an acceptance event'
  );

  const designCollaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    partner.user.id
  );

  t.equal(
    designCollaborator!.userId,
    partner.user.id,
    'The partner is a design collaborator'
  );
  t.equal(
    designCollaborator!.role,
    'PARTNER',
    'The partner has the PARTNER role'
  );

  t.equal(notificationStub.callCount, 1);
});

test('Partner pairing: accept on a deleted design', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const designer = await createUser({ withSession: false });
  const partner = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'SOCKS',
    title: 'Off-White Socks',
    userId: designer.user.id
  });
  const { bid } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: admin.user.id
  });

  await put(`/bids/${bid.id}/assignees/${partner.user.id}`, {
    headers: authHeader(admin.session.id)
  });

  await ProductDesignsDAO.deleteById(design.id);

  const [noDesignResponse] = await post(`/bids/${bid.id}/accept`, {
    headers: authHeader(partner.session.id)
  });

  t.equal(noDesignResponse.status, 400, 'Expect the bid assignment to fail.');
});

test('Partner pairing: reject', async (t: Test) => {
  await generatePricingValues();
  const admin = await createUser({ role: 'ADMIN' });
  const designer = await createUser();
  const partner = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: designer.user.id
  });
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    expiresAt: null,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });
  const quotesRequest = await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 300
      }
    ],
    headers: authHeader(admin.session.id)
  });
  const createdAt = new Date();
  const dueDate = new Date(createdAt.getTime() + daysToMs(10));
  const bid = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 20000,
    createdAt,
    createdBy: admin.user.id,
    completedAt: null,
    description: 'Do me a favor, please.',
    dueDate,
    id: uuid.v4(),
    quoteId: quotesRequest[1][0].id,
    taskTypeIds: []
  });
  const bidRejection = {
    createdBy: admin.user.id,
    priceTooLow: false,
    deadlineTooShort: false,
    missingInformation: false,
    other: true,
    notes: 'Unable to complete as designed'
  };
  await put(`/bids/${bid.id}/assignees/${partner.user.id}`, {
    headers: authHeader(admin.session.id)
  });
  const notificationStub = sandbox()
    .stub(NotificationsService, 'sendPartnerRejectServiceBidNotification')
    .resolves();

  const [missingBidResponse] = await post(`/bids/${uuid.v4()}/reject`, {
    headers: authHeader(partner.session.id),
    body: bidRejection
  });
  t.equal(missingBidResponse.status, 404, 'Unknown bid returns 404');

  const [unauthorizedBidResponse] = await post(`/bids/${bid.id}/reject`, {
    headers: authHeader(designer.session.id)
  });
  t.equal(
    unauthorizedBidResponse.status,
    403,
    'Non-collaborator cannot reject bid'
  );

  const [response] = await post(`/bids/${bid.id}/reject`, {
    headers: authHeader(partner.session.id),
    body: bidRejection
  });

  const designEvents = await DesignEventsDAO.findByDesignId(design.id);
  const createdRejection = await BidRejectionDAO.findByBidId(bid.id);

  t.equal(response.status, 204);
  t.deepEqual(
    designEvents.map(
      (event: DesignEvent): any => ({
        actorId: event.actorId,
        designId: event.designId,
        type: event.type
      })
    ),
    [
      {
        actorId: admin.user.id,
        designId: design.id,
        type: 'COMMIT_QUOTE'
      },
      {
        actorId: admin.user.id,
        designId: design.id,
        type: 'BID_DESIGN'
      },
      {
        actorId: partner.user.id,
        designId: design.id,
        type: 'REJECT_SERVICE_BID'
      }
    ],
    'Adds a rejection event'
  );
  t.deepEqual(omit(createdRejection, 'id', 'createdAt', 'bidId'), bidRejection);

  const designCollaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    partner.user.id
  );

  t.equal(designCollaborator, null, 'The partner is no longer a collaborator');

  t.equal(notificationStub.callCount, 1);
});
