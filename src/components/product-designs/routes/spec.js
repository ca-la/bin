'use strict';

const uuid = require('node-uuid');
const { omit } = require('lodash');

const CollectionsDAO = require('../../collections/dao');
const createUser = require('../../../test-helpers/create-user');
const DesignEventsDAO = require('../../../dao/design-events');
const ProductDesignsDAO = require('../dao');
const EmailService = require('../../../services/email');
const {
  authHeader,
  get,
  patch,
  post,
  put
} = require('../../../test-helpers/http');
const { test, sandbox } = require('../../../test-helpers/fresh');
const AWSService = require('../../../services/aws');
const { addDesign } = require('../../../test-helpers/collections');

test('PATCH /product-designs/:id rejects empty data', t => {
  let designId;
  let sessionId;

  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      return ProductDesignsDAO.create({
        userId: user.id
      });
    })
    .then(design => {
      designId = design.id;

      return patch(`/product-designs/${designId}`, {
        headers: authHeader(sessionId),
        body: {}
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, 'No data provided');
    });
});

test('PATCH /product-designs/:id allows certain params, rejects others', t => {
  let designId;
  let sessionId;

  return createUser()
    .then(({ session }) => {
      sessionId = session.id;

      return post('/product-designs', {
        headers: authHeader(sessionId),
        body: {
          productType: 'TEESHIRT'
        }
      });
    })
    .then(response => {
      designId = response[1].id;

      return patch(`/product-designs/${designId}`, {
        headers: authHeader(sessionId),
        body: {
          title: 'Fizz Buzz',
          showPricingBreakdown: true
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.productType, 'TEESHIRT');
      t.equal(body.title, 'Fizz Buzz');
      t.equal(body.showPricingBreakdown, true);
      t.equal(body.role, 'EDIT');
    });
});

test('PATCH /product-designs/:id allows admins to update a wider range of keys', t => {
  let designId;
  let sessionId;

  return createUser({ role: 'ADMIN' })
    .then(({ user, session }) => {
      sessionId = session.id;

      return ProductDesignsDAO.create({
        userId: user.id
      });
    })
    .then(design => {
      designId = design.id;

      return patch(`/product-designs/${designId}`, {
        headers: authHeader(sessionId),
        body: {
          title: 'Fizz Buzz',
          showPricingBreakdown: true,
          overridePricingTable: {
            profit: {
              unitProfitCents: 1234
            }
          }
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.title, 'Fizz Buzz');
      t.equal(body.showPricingBreakdown, true);
      t.equal(body.overridePricingTable.profit.unitProfitCents, 1234);
    });
});

test('GET /product-designs allows searching', async t => {
  sandbox()
    .stub(EmailService, 'enqueueSend')
    .returns(Promise.resolve());

  const { user, session } = await createUser({ role: 'ADMIN' });

  const first = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Thing One'
  });

  await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Bzzt Two'
  });

  const third = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Thing Three'
  });

  const [response, body] = await get('/product-designs?search=thing', {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.equal(body.length, 2);

  t.deepEqual([body[0].id, body[1].id].sort(), [first.id, third.id].sort());
});

test('GET /product-designs allows fetching designs await quotes', async t => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const first = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Thing One'
  });
  const second = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Bzzt Two'
  });
  const events = [
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 11, 23),
      designId: first.id,
      id: uuid.v4(),
      targetId: null,
      type: 'SUBMIT_DESIGN'
    },
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 11, 23),
      designId: second.id,
      id: uuid.v4(),
      targetId: null,
      type: 'SUBMIT_DESIGN'
    },
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 11, 25),
      designId: second.id,
      id: uuid.v4(),
      targetId: user.id,
      type: 'BID_DESIGN'
    }
  ];
  await DesignEventsDAO.createAll(events);

  const [response, needsQuote] = await get(
    '/product-designs?limit=20&offset=0&needsQuote=true',
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(needsQuote, [
    {
      ...first,
      owner: {
        ...omit(user, ['passwordHash']),
        createdAt: new Date(user.createdAt).toISOString()
      },
      createdAt: new Date(first.createdAt).toISOString(),
      permissions: {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true
      }
    }
  ]);
});

test('GET /product-designs/:designId/upload-policy/:sectionId', async t => {
  const { user, session } = await createUser({ role: 'ADMIN' });

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const sectionId = uuid.v4();

  sandbox()
    .stub(AWSService, 'getThumbnailUploadPolicy')
    .returns(
      Promise.resolve({
        url: 'stub url',
        fields: {
          'x-aws-foo': 'bar'
        }
      })
    );

  const [response, body] = await get(
    `/product-designs/${design.id}/upload-policy/${sectionId}`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(body, {
    remoteFileName: sectionId,
    uploadUrl: 'stub url',
    downloadUrl: `https://svgthumb-uploads-dev.s3.amazonaws.com/${sectionId}`,
    formData: {
      'x-aws-foo': 'bar'
    }
  });
});

test('POST /product-designs/:designId/events with multiple events creates them', async t => {
  const { user, session } = await createUser();

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const inputEvents = [
    {
      bidId: null,
      createdAt: new Date(2012, 12, 24),
      designId: design.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: null,
      approvalStepId: null,
      approvalSubmissionId: null,
      commentId: null,
      taskTypeId: null,
      type: 'SUBMIT_DESIGN'
    },
    {
      bidId: null,
      createdAt: new Date(2012, 12, 23),
      designId: design.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: null,
      approvalStepId: null,
      approvalSubmissionId: null,
      commentId: null,
      taskTypeId: null,
      type: 'SUBMIT_DESIGN'
    }
  ];

  const [response, events] = await post(
    `/product-designs/${design.id}/events`,
    {
      headers: authHeader(session.id),
      body: inputEvents
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(events, [
    {
      ...inputEvents[1],
      actorId: user.id,
      createdAt: new Date(2012, 12, 23).toISOString()
    },
    {
      ...inputEvents[0],
      actorId: user.id,
      createdAt: new Date(2012, 12, 24).toISOString()
    }
  ]);
});

test('POST /product-designs/:designId/events with multiple events with some forbidden types returns 403', async t => {
  const { user, session } = await createUser();

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const inputEvents = [
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 12, 24),
      designId: design.id,
      id: uuid.v4(),
      targetId: null,
      approvalStepId: null,
      type: 'SUBMIT_DESIGN'
    },
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 12, 23),
      designId: design.id,
      id: uuid.v4(),
      targetId: null,
      approvalStepId: null,
      type: 'BID_DESIGN'
    },
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 12, 21),
      designId: design.id,
      id: uuid.v4(),
      targetId: null,
      approvalStepId: null,
      type: 'ACCEPT_SERVICE_BID'
    }
  ];

  const [response] = await post(`/product-designs/${design.id}/events`, {
    headers: authHeader(session.id),
    body: inputEvents
  });

  t.equal(response.status, 403);
});

test('PUT /product-designs/:designId/events/:eventId with an event creates it', async t => {
  const testDate = new Date(2012, 11, 24);
  sandbox().useFakeTimers(testDate);
  const { user, session } = await createUser();

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const inputEvent = {
    bidId: null,
    createdAt: testDate,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    approvalStepId: null,
    approvalSubmissionId: null,
    commentId: null,
    taskTypeId: null,
    type: 'SUBMIT_DESIGN'
  };

  const [response, event] = await put(
    `/product-designs/${design.id}/events/${inputEvent.id}`,
    {
      headers: authHeader(session.id),
      body: inputEvent
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(event, {
    ...inputEvent,
    actorId: user.id,
    createdAt: testDate.toISOString(),
    designId: design.id
  });
});

test('PUT /product-designs/:designId/events/:eventId a forbidden type returns 403', async t => {
  const { user, session } = await createUser();

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const inputEvent = {
    actorId: user.id,
    bidId: null,
    createdAt: new Date(2012, 12, 23),
    designId: design.id,
    id: uuid.v4(),
    targetId: null,
    type: 'BID_DESIGN'
  };

  const [response] = await put(
    `/product-designs/${design.id}/events/${inputEvent.id}`,
    {
      headers: authHeader(session.id),
      body: inputEvent
    }
  );

  t.equal(response.status, 403);
});

test('PUT /product-designs/:designId/events/:eventId with wrong ID in body', async t => {
  const { user, session } = await createUser();

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const inputEvent = {
    actorId: user.id,
    bidId: null,
    createdAt: new Date(2012, 12, 24),
    designId: design.id,
    id: uuid.v4(),
    targetId: null,
    type: 'SUBMIT_DESIGN'
  };

  const [response] = await put(
    `/product-designs/${design.id}/events/some-other-id`,
    {
      headers: authHeader(session.id),
      body: inputEvent
    }
  );

  t.equal(response.status, 400);
});

test('GET /product-designs/:designId/events', async t => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const submitEvent = {
    actorId: user.id,
    bidId: null,
    createdAt: new Date(2012, 12, 21),
    designId: design.id,
    id: uuid.v4(),
    targetId: null,
    type: 'SUBMIT_DESIGN'
  };
  const bidEvent = {
    actorId: user.id,
    bidId: null,
    createdAt: new Date(2012, 12, 23),
    designId: design.id,
    id: uuid.v4(),
    targetId: null,
    type: 'BID_DESIGN'
  };
  const acceptBidEvent = {
    actorId: user.id,
    bidId: null,
    createdAt: new Date(2012, 12, 24),
    designId: design.id,
    id: uuid.v4(),
    targetId: null,
    type: 'ACCEPT_SERVICE_BID'
  };

  const [_postResponse, createdEvents] = await post(
    `/product-designs/${design.id}/events`,
    {
      headers: authHeader(session.id),
      body: [acceptBidEvent, submitEvent, bidEvent]
    }
  );

  const [response, designEvents] = await get(
    `/product-designs/${design.id}/events`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(designEvents, createdEvents);
});

test('GET /product-designs/:designId/collections returns collections', async t => {
  const { user, session } = await createUser({ role: 'ADMIN' });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Cool Collection',
    id: uuid.v4(),
    title: 'Virgil Drop'
  });
  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  await addDesign(collection.id, design.id);

  const [response, body] = await get(
    `/product-designs/${design.id}/collections`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.equal(body.length, 1, 'Returns the collection');
  const responseCollection = body[0];
  t.deepEqual(
    responseCollection.id,
    collection.id,
    'Returns the same collection'
  );
});

test('GET /product-designs/:designId returns 404 if not found', async t => {
  const { session } = await createUser();

  const [response, body] = await get(
    '/product-designs/00000000-0000-0000-0000-000000000000',
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 404);
  t.equal(body.message, 'Design not found');
});
