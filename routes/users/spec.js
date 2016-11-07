'use strict';

const { test } = require('../../test-helpers/fresh');
const { post } = require('../../test-helpers/http');

test('POST /users returns a 400 if required data is missing', (t) => {
  return post('/users', { body: {} })
    .then(([response]) => {
      t.equal(response.status, 400, 'status=400');
    });
});

test('POST /users returns new user data', (t) => {
  return post('/users', {
    body: {
      name: 'Q User',
      email: 'user@example.com',
      zip: '94117',
      password: 'hunter2'
    }
  }).then(([response, body]) => {
    t.equal(response.status, 201, 'status=201');
    t.equal(body.name, 'Q User');
    t.equal(body.email, 'user@example.com');
    t.equal(body.password, undefined);
    t.equal(body.passwordHash, undefined);
  });
});
