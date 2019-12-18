import { test, Test } from '../../test-helpers/fresh';
import createUser from '../../test-helpers/create-user';
import { authHeader, get, post } from '../../test-helpers/http';
import * as StorefrontsDAO from '../../components/storefronts/dao';
import * as StorefrontUsersDAO from '../../components/storefronts/users/dao';
import * as StorefrontTokensDAO from '../../components/storefronts/tokens/dao';
import db from '../../services/db';
import Knex from 'knex';
import { createStorefront } from '../../services/create-storefront';
import { ProviderName } from '@cala/ts-lib';

test('POST /storefronts creates a new Storefront and related resources', async (t: Test) => {
  const { session, user } = await createUser();

  const [response, body] = await post('/storefronts', {
    headers: authHeader(session.id),
    body: {
      name: 'some-shoppe',
      accessToken: 'some-super-secure-access-token',
      baseUrl: 'https://some-shoppe.myshopify.com',
      providerName: 'shopify'
    }
  });

  t.equal(response.status, 200);
  t.equal(body.createdBy, user.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    const storefront = await StorefrontsDAO.findById({ id: body.id, trx });
    t.deepEqual(JSON.parse(JSON.stringify(storefront)), body);

    const storefrontUser = await StorefrontUsersDAO.findByUserAndStorefront({
      userId: user.id,
      storefrontId: storefront!.id,
      trx
    });

    t.ok(storefrontUser, 'Creates a StorefrontUser for the session user');
    const storefrontTokens = await StorefrontTokensDAO.findByStorefront({
      storefrontId: storefront!.id,
      trx
    });
    t.equal(storefrontTokens.length, 1, 'Creates a StorefrontToken');
  });
});

test('GET /storefronts/:storefrontId returns a storefront', async (t: Test) => {
  const { session, user } = await createUser();

  const storefront = await createStorefront({
    accessToken: 'some-super-secure-access-token',
    baseUrl: 'https://some-shoppe.myshopify.com',
    name: 'some-shoppe',
    providerName: 'shopify' as ProviderName,
    userId: user.id
  });

  const [response, body] = await get(`/storefronts/${storefront.id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body.createdBy, user.id);
});

test('GET /storefronts/:storefrontId/tokens returns a storefronts tokens', async (t: Test) => {
  const { session, user } = await createUser({ role: 'ADMIN' });

  const storefront = await createStorefront({
    accessToken: 'some-super-secure-access-token',
    baseUrl: 'https://some-shoppe.myshopify.com',
    name: 'some-shoppe',
    providerName: 'shopify' as ProviderName,
    userId: user.id
  });

  const [response, body] = await get(`/storefronts/${storefront.id}/tokens`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body[0].baseUrl, 'https://some-shoppe.myshopify.com');
  t.equal(body[0].token, 'some-super-secure-access-token');
});
