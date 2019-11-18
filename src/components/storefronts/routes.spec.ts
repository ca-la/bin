import { test, Test } from '../../test-helpers/fresh';
import createUser from '../../test-helpers/create-user';
import { authHeader, post } from '../../test-helpers/http';
import * as StorefrontsDAO from '../../components/storefronts/dao';
import * as StorefrontUsersDAO from '../../components/storefronts/users/dao';
import * as StorefrontTokensDAO from '../../components/storefronts/tokens/dao';

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

  const storefront = await StorefrontsDAO.findById(body.id);

  t.deepEqual(JSON.parse(JSON.stringify(storefront)), body);

  const storefrontUser = await StorefrontUsersDAO.findByUserAndStorefront(
    user.id,
    storefront!.id
  );

  t.ok(storefrontUser, 'Creates a StorefrontUser for the session user');

  const storefrontTokens = await StorefrontTokensDAO.findByStorefront(
    storefront!.id
  );

  t.equal(storefrontTokens.length, 1, 'Creates a StorefrontToken');
});
