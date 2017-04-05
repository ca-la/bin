'use strict';

const Promise = require('bluebird');

const { post } = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');
const UserAttributesService = require('../../services/user-attributes');

const examplePayload = require('../../test-helpers/fixtures/shopify-order-create-payload.json');

test('POST /shopify-webhooks/orders-create calls the correct method', (t) => {
  sandbox().stub(UserAttributesService,
    'recordPurchase',
    () => Promise.resolve()
  );

  return post('/shopify-webhooks/orders-create', { body: examplePayload })
    .then(([response]) => {
      t.equal(response.status, 200);

      t.equal(UserAttributesService.recordPurchase.callCount, 1);

      t.equal(
        UserAttributesService.recordPurchase.firstCall.args[0],
        'cc2db0b9-42f0-4697-9286-7b676b163c0b'
      );
    });
});

test('POST /shopify-webhooks/orders-create returns 400 if user id is missing', (t) => {
  const payload = Object.assign({}, examplePayload, { note_attributes: null });

  return post('/shopify-webhooks/orders-create', { body: payload })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, 'Missing user ID');
    });
});
