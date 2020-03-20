import { authHeader, get } from '../../../test-helpers/http';
import { test, Test } from '../../../test-helpers/fresh';
import createUser from '../../../test-helpers/create-user';
import { generateDesign } from '../../../test-helpers/factories/product-design';
import createApprovalSteps from '../../../services/create-approval-steps';

test('GET /product-designs/:designId/approval-steps', async (t: Test) => {
  const designer = await createUser();
  const admin = await createUser({ role: 'ADMIN' });
  const other = await createUser();

  const d1 = await generateDesign({ userId: designer.user.id });
  const created = await createApprovalSteps(d1.id);

  const [response, body] = await get(
    `/product-designs/${d1.id}/approval-steps`,
    {
      headers: authHeader(designer.session.id)
    }
  );

  t.is(response.status, 200);
  t.deepEqual(body, JSON.parse(JSON.stringify(created)));

  const adminRes = await get(`/product-designs/${d1.id}/approval-steps`, {
    headers: authHeader(admin.session.id)
  });

  t.is(adminRes[0].status, 200);
  t.deepEqual(adminRes[1], JSON.parse(JSON.stringify(created)));

  const otherRes = await get(`/product-designs/${d1.id}/approval-steps`, {
    headers: authHeader(other.session.id)
  });

  t.is(otherRes[0].status, 403);
});
