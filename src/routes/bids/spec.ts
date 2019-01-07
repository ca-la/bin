import * as uuid from 'node-uuid';
import { omit } from 'lodash';
import * as sinon from 'sinon';

import { sandbox, test, Test } from '../../test-helpers/fresh';
import { authHeader, del, get, post, put } from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');
import generateBid from '../../test-helpers/factories/bid';
import * as BidsDAO from '../../dao/bids';
import * as CollaboratorsDAO from '../../dao/collaborators';
import * as DesignEventsDAO from '../../dao/design-events';
import * as PricingQuotesDAO from '../../dao/pricing-quotes';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as NotificationsService from '../../services/create-notifications';

test('GET /bids', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const partner = await createUser({ role: 'PARTNER' });
  const other = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: admin.user.id
  });

  const { bid, quote } = await generateBid(design.id, admin.user.id);
  const otherBid = await BidsDAO.create({
    bidPriceCents: 100000,
    createdAt: new Date(2012, 12, 22),
    createdBy: admin.user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  });

  await put(
    `/bids/${bid.id}/assignees/${partner.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  await put(
    `/bids/${otherBid.id}/assignees/${other.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  const [response, bids] = await get(
    `/bids?userId=${partner.user.id}`,
    { headers: authHeader(partner.session.id) }
  );
  t.equal(response.status, 200);
  t.deepEqual(bids, [{
    ...bid,
    createdAt: bid.createdAt.toISOString(),
    design: {
      ...design,
      createdAt: design.createdAt.toISOString()
    }
  }], 'returns only bids assigned to requested user');
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

  const { bid, quote } = await generateBid(design.id, admin.user.id);
  const otherBid = await BidsDAO.create({
    bidPriceCents: 100000,
    createdAt: new Date(2012, 12, 22),
    createdBy: admin.user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  });
  const expiredBid = await BidsDAO.create({
    bidPriceCents: 100000,
    createdAt: new Date(2012, 12, 22),
    createdBy: admin.user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  });

  await put(
    `/bids/${bid.id}/assignees/${partner.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  await put(
    `/bids/${expiredBid.id}/assignees/${partner.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  await put(
    `/bids/${otherBid.id}/assignees/${other.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  const [response, bids] = await get(
    `/bids?userId=${partner.user.id}&state=OPEN`,
    { headers: authHeader(partner.session.id) }
  );
  t.equal(response.status, 200);
  t.deepEqual(bids, [{
    ...bid,
    createdAt: bid.createdAt.toISOString(),
    design: {
      ...design,
      createdAt: design.createdAt.toISOString()
    }
  }], 'returns only bids assigned to requested user');
});

test('GET /bids?userId&state=EXPIRED', async (t: Test) => {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const admin = await createUser({ role: 'ADMIN' });
  const partner = await createUser({ role: 'PARTNER' });
  const other = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: admin.user.id
  });

  const { bid, quote } = await generateBid(design.id, admin.user.id);
  const otherBid = await BidsDAO.create({
    bidPriceCents: 100000,
    createdAt: new Date(2012, 12, 22),
    createdBy: admin.user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  });
  const expiredBid = await BidsDAO.create({
    bidPriceCents: 100000,
    createdAt: twoDaysAgo,
    createdBy: admin.user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  });

  await put(
    `/bids/${bid.id}/assignees/${partner.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  await put(
    `/bids/${expiredBid.id}/assignees/${partner.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  await put(
    `/bids/${otherBid.id}/assignees/${other.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  const [response, bids] = await get(
    `/bids?userId=${partner.user.id}&state=EXPIRED`,
    { headers: authHeader(partner.session.id) }
  );
  t.equal(response.status, 200);
  t.deepEqual(bids, [{
    ...expiredBid,
    createdAt: expiredBid.createdAt.toISOString(),
    design: {
      ...design,
      createdAt: design.createdAt.toISOString()
    }
  }], 'returns only expired bid assigned to the user');
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

  const { bid, quote } = await generateBid(design.id, admin.user.id);
  const otherBid = await BidsDAO.create({
    bidPriceCents: 100000,
    createdAt: new Date(2012, 12, 22),
    createdBy: admin.user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  });

  await put(
    `/bids/${bid.id}/assignees/${partner.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  await put(
    `/bids/${otherBid.id}/assignees/${other.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  const [response, bids] = await get(
    `/bids?userId=${partner.user.id}&state=ACCEPTED`,
    { headers: authHeader(partner.session.id) }
  );
  t.equal(response.status, 200);
  t.deepEqual(bids, [], 'returns empty bids list');
});

test('PUT /bids/:bidId/assignees/:userId', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const collaborator = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });
  await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: collaborator.user.id
  });

  const { bid } = await generateBid(design.id, user.id);

  const notificationStub = sandbox()
    .stub(NotificationsService, 'sendPartnerDesignBid')
    .resolves();

  const [response] = await put(
    `/bids/${bid.id}/assignees/${user.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(response.status, 204, 'Successfully assigns first partner');
  sinon.assert.callCount(notificationStub, 1);

  const collaboratorAssignment = await put(
    `/bids/${bid.id}/assignees/${collaborator.user.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(collaboratorAssignment[0].status, 204, 'Successfully assigns second partner');
  sinon.assert.callCount(notificationStub, 2);

  const [collaboratorResponse, collaborators] = await get(
    `/collaborators?designId=${design.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(collaboratorResponse.status, 200);
  t.equal(collaborators[0].userId, collaborator.user.id);
  t.equal(collaborators[0].role, 'EDIT', 'Keeps existing role');
  t.equal(collaborators[1].userId, user.id);

  const [notFoundUser] = await put(
    `/bids/${bid.id}/assignees/${uuid.v4()}`,
    { headers: authHeader(session.id) }
  );
  t.equal(notFoundUser.status, 404);

  const [notFoundBid] = await put(
    `/bids/${uuid.v4()}/assignees/${user.id}`,
    { headers: authHeader(session.id) }
  );
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

  const { bid } = await generateBid(design.id, user.id);

  await put(
    `/bids/${bid.id}/assignees/${partner.id}`,
    { headers: authHeader(session.id) }
  );

  const [response, assignees] = await get(
    `/bids/${bid.id}/assignees`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(assignees, [{
    ...omit(partner, ['passwordHash']),
    createdAt: partner.createdAt.toISOString()
  }]);
});

test('DELETE /bids/:bidId/assignees/:userId', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const { user: partner } = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const { bid } = await generateBid(design.id, user.id);

  await put(
    `/bids/${bid.id}/assignees/${partner.id}`,
    { headers: authHeader(session.id) }
  );
  const [response] = await del(
    `/bids/${bid.id}/assignees/${partner.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(response.status, 204);

  const assignees = await get(
    `/bids/${bid.id}/assignees`,
    { headers: authHeader(session.id) }
  );
  t.deepEqual(assignees[1], []);

  const [collaboratorResponse, collaborators] = await get(
    `/collaborators?designId=${design.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(collaboratorResponse.status, 200);
  t.deepEqual(collaborators, []);
});

test('POST /bids/:bidId/accept', async (t: Test) => {
  const designer = await createUser({ withSession: false });
  const partner = await createUser({ role: 'PARTNER' });
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: designer.user.id
  });
  const bidId = uuid.v4();

  sandbox().stub(BidsDAO, 'findById').resolves({
    id: bidId,
    quoteId: 'quoteId'
  });
  sandbox().stub(PricingQuotesDAO, 'findById').resolves({
    designId: design.id,
    id: 'quoteId'
  });
  sandbox().stub(CollaboratorsDAO, 'findByDesignAndUser').resolves({
    designId: design.id,
    id: 'collaboratorId',
    role: 'PREVIEW',
    userId: partner.user.id
  });
  const mockCreateDesignEvent = sandbox().stub(DesignEventsDAO, 'create').resolves();
  const mockCollaboratorUpdate = sandbox().stub(CollaboratorsDAO, 'update').resolves();

  const [response] = await post(
    `/bids/${bidId}/accept`,
    { headers: authHeader(partner.session.id) }
  );

  t.equal(response.status, 204);
  t.equal(mockCreateDesignEvent.callCount, 1);
  t.equal(mockCreateDesignEvent.getCall(0).args[0].actorId, partner.user.id);
  t.equal(mockCreateDesignEvent.getCall(0).args[0].bidId, bidId);
  t.equal(mockCreateDesignEvent.getCall(0).args[0].designId, design.id);
  t.equal(mockCollaboratorUpdate.callCount, 1);
  t.equal(mockCollaboratorUpdate.getCall(0).args[0], 'collaboratorId');
  t.deepEqual(mockCollaboratorUpdate.getCall(0).args[1], { role: 'PARTNER' });
});
