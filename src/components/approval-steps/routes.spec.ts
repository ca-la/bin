import { authHeader, get } from '../../test-helpers/http';
import { test, Test } from '../../test-helpers/fresh';
import createUser from '../../test-helpers/create-user';
import { generateDesign } from '../../test-helpers/factories/product-design';

test('GET /design-approval-steps?designId=:designId', async (t: Test) => {
  const designer = await createUser();
  const admin = await createUser({ role: 'ADMIN' });
  const other = await createUser();

  const d1 = await generateDesign({ userId: designer.user.id });

  const [response, body] = await get(
    `/design-approval-steps?designId=${d1.id}`,
    {
      headers: authHeader(designer.session.id)
    }
  );

  t.is(response.status, 200);
  t.is(body.length, 4);

  const adminRes = await get(`/design-approval-steps?designId=${d1.id}`, {
    headers: authHeader(admin.session.id)
  });

  t.is(adminRes[0].status, 200);
  t.is(adminRes[1].length, 4);

  const otherRes = await get(`/design-approval-steps?designId=${d1.id}`, {
    headers: authHeader(other.session.id)
  });

  t.is(otherRes[0].status, 403);
});
