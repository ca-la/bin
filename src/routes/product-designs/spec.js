'use strict';

const createUser = require('../../test-helpers/create-user');
const ProductDesignsDAO = require('../../dao/product-designs');
const EmailService = require('../../services/email');
const {
  authHeader, get, patch, put
} = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');

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
