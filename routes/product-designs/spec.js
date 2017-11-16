'use strict';

const createUser = require('../../test-helpers/create-user');
const ProductDesignsDAO = require('../../dao/product-designs');
const EmailService = require('../../services/email');
const { authHeader, patch, put } = require('../../test-helpers/http');
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

test('PUT /product-designs/:id/status updates a status', (t) => {
  sandbox().stub(EmailService, 'enqueueSend', () => Promise.resolve());
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
