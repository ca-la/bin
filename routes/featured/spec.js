'use strict';

const { get } = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

test('GET /featured/app-banner returns 204 when not eligible for a bnner', (t) => {
  return get('/featured/app-banner?appOpenCount=8&appInstalledForSeconds=50')
    .then(([response, body]) => {
      t.equal(response.status, 204);
      t.equal(body, '');
    });
});

test('GET /featured/app-banner returns banner details when eligible', (t) => {
  return get('/featured/app-banner?appOpenCount=2&appInstalledForSeconds=123')
    .then(([response, body]) => {
      t.equal(response.status, 200);

      t.deepEqual(body, {
        title: 'Get $30 off your first order',
        subtitle: 'plus be the first to get new designer updates',
        buttonText: 'Sign Up'
      });
    });
});
