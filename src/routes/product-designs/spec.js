'use strict';

const uuid = require('node-uuid');
const { omit } = require('lodash');

const CollectionsDAO = require('../../dao/collections');
const createUser = require('../../test-helpers/create-user');
const DesignEventsDAO = require('../../dao/design-events');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const EmailService = require('../../services/email');
const {
  authHeader, get, patch, post, put
} = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');
const AWSService = require('../../services/aws');

test('PATCH /product-designs/:id rejects empty data', (t) => {
  let designId;
  let sessionId;

  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      return ProductDesignsDAO.create({
        userId: user.id
      });
    })
    .then((design) => {
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

test('PATCH /product-designs/:id allows certain params, rejects others', (t) => {
  let designId;
  let sessionId;

  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      return ProductDesignsDAO.create({
        userId: user.id
      });
    })
    .then((design) => {
      designId = design.id;

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
      t.equal(body.title, 'Fizz Buzz');
      t.equal(body.showPricingBreakdown, true);
    });
});

test('PATCH /product-designs/:id allows admins to update a wider range of keys', (t) => {
  let designId;
  let sessionId;

  return createUser({ role: 'ADMIN' })
    .then(({ user, session }) => {
      sessionId = session.id;

      return ProductDesignsDAO.create({
        userId: user.id
      });
    })
    .then((design) => {
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

test('PUT /product-designs/:id/status updates a status', (t) => {
  sandbox().stub(EmailService, 'enqueueSend').returns(Promise.resolve());

  let designId;
  let sessionId;

  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      return ProductDesignsDAO.create({
        userId: user.id
      });
    })
    .then((design) => {
      designId = design.id;

      return put(`/product-designs/${designId}/status`, {
        headers: authHeader(sessionId),
        body: {
          newStatus: 'IN_REVIEW'
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.status, 'IN_REVIEW');
    });
});

test('PUT /product-designs/:id/status does not update to an invalid status', (t) => {
  let designId;
  let sessionId;

  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      return ProductDesignsDAO.create({
        userId: user.id
      });
    })
    .then((design) => {
      designId = design.id;

      return put(`/product-designs/${designId}/status`, {
        headers: authHeader(sessionId),
        body: {
          newStatus: 'THINKING_ABOUT_STUFF'
        }
      });
    })
    .then(([response]) => {
      t.equal(response.status, 400);
    });
});

test('GET /product-designs allows searching', async (t) => {
  sandbox().stub(EmailService, 'enqueueSend').returns(Promise.resolve());

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

  t.deepEqual(
    [body[0].id, body[1].id].sort(),
    [first.id, third.id].sort()
  );
});

test('GET /product-designs allows fetching designs await quotes', async (t) => {
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
  t.deepEqual(needsQuote, [{
    ...first,
    owner: {
      ...omit(user, ['passwordHash']),
      createdAt: new Date(user.createdAt).toISOString()
    },
    createdAt: new Date(first.createdAt).toISOString()
  }]);
});

test('GET /product-designs/:designId/upload-policy/:sectionId', async (t) => {
  const { user, session } = await createUser({ role: 'ADMIN' });

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const sectionId = uuid.v4();

  sandbox().stub(AWSService, 'getThumbnailUploadPolicy').returns(Promise.resolve({
    url: 'stub url',
    fields: {
      'x-aws-foo': 'bar'
    }
  }));

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

test('POST /product-designs/:designId/sections/:sectionId/annotations creates annotation with valid data', async (t) => {
  const { user, session } = await createUser();

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const section = await ProductDesignSectionsDAO.create({
    templateName: 'Template Name',
    type: 'FLAT_SKETCH',
    designId: design.id,
    position: 0
  });

  const [validResponse] = await post(
    `/product-designs/${design.id}/sections/${section.id}/annotations`,
    {
      headers: authHeader(session.id),
      body: {
        x: 0,
        y: 0,
        text: 'Annotation Text'
      }
    }
  );

  t.equal(validResponse.status, 200);
});

test('POST /product-designs/:designId/sections/:sectionId/annotations returns 400 with invalid input', async (t) => {
  const { user, session } = await createUser();

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const section = await ProductDesignSectionsDAO.create({
    templateName: 'Template Name',
    type: 'FLAT_SKETCH',
    designId: design.id,
    position: 0
  });

  const [invalidResponse] = await post(
    `/product-designs/${design.id}/sections/${section.id}/annotations`,
    {
      headers: authHeader(session.id),
      body: {
        x: 0,
        y: 0
      }
    }
  );

  t.equal(invalidResponse.status, 400);
});

test('POST /product-designs/:designId/events with multiple events creates them', async (t) => {
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
      targetId: null,
      type: 'SUBMIT_DESIGN'
    },
    {
      bidId: null,
      createdAt: new Date(2012, 12, 23),
      designId: design.id,
      id: uuid.v4(),
      targetId: null,
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

test('POST /product-designs/:designId/events with multiple events with some forbidden types returns 403', async (t) => {
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
      type: 'SUBMIT_DESIGN'
    },
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 12, 23),
      designId: design.id,
      id: uuid.v4(),
      targetId: null,
      type: 'BID_DESIGN'
    },
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 12, 21),
      designId: design.id,
      id: uuid.v4(),
      targetId: null,
      type: 'ACCEPT_SERVICE_BID'
    }
  ];

  const [response] = await post(
    `/product-designs/${design.id}/events`,
    {
      headers: authHeader(session.id),
      body: inputEvents
    }
  );

  t.equal(response.status, 403);
});

test('PUT /product-designs/:designId/events/:eventId with an event creates it', async (t) => {
  const { user, session } = await createUser();

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });
  const inputEvent = {
    bidId: null,
    createdAt: new Date(2012, 12, 24),
    id: uuid.v4(),
    targetId: null,
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
    createdAt: new Date(2012, 12, 24).toISOString(),
    designId: design.id
  });
});

test('PUT /product-designs/:designId/events/:eventId a forbidden type returns 403', async (t) => {
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

test('PUT /product-designs/:designId/events/:eventId with wrong ID in body', async (t) => {
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

test('GET /product-designs/:designId/events', async (t) => {
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

test('GET /product-designs/:designId/collections returns collections', async (t) => {
  const { user, session } = await createUser({ role: 'ADMIN' });

  const collectionFixture = { id: 'my-new-collection' };
  sandbox().stub(CollectionsDAO, 'findByDesign').resolves([collectionFixture]);

  const design = await ProductDesignsDAO.create({
    userId: user.id,
    title: 'Design'
  });

  const [response, body] = await get(
    `/product-designs/${design.id}/collections`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(body, [collectionFixture]);
});
