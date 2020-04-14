import Knex from 'knex';

import { authHeader, get } from '../../test-helpers/http';
import { test, Test } from '../../test-helpers/fresh';
import createUser from '../../test-helpers/create-user';
import { generateDesign } from '../../test-helpers/factories/product-design';
import * as ApprovalStepCommentDAO from '../approval-step-comments/dao';
import * as ApprovalStepsDAO from '../approval-steps/dao';
import db from '../../services/db';
import generateComment from '../../test-helpers/factories/comment';
import generateDesignEvent from '../../test-helpers/factories/design-event';

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

test('GET /design-approval-steps/:stepId/stream-items', async (t: Test) => {
  const designer = await createUser();
  const d1 = await generateDesign({ userId: designer.user.id });
  let approvalStepId = null;
  await db.transaction(async (trx: Knex.Transaction) => {
    approvalStepId = (await ApprovalStepsDAO.findByDesign(trx, d1.id))[0].id;
    const { comment: comment1 } = await generateComment({
      text: 'Going to submit',
      userId: designer.user.id
    });
    await ApprovalStepCommentDAO.create(trx, {
      approvalStepId,
      commentId: comment1.id
    });

    await generateDesignEvent({
      actorId: designer.user.id,
      approvalStepId,
      designId: d1.id,
      type: 'SUBMIT_DESIGN'
    });

    const { comment: comment2 } = await generateComment({
      text: 'Going to checkout',
      userId: designer.user.id
    });
    await ApprovalStepCommentDAO.create(trx, {
      approvalStepId,
      commentId: comment2.id
    });

    await generateDesignEvent({
      actorId: designer.user.id,
      approvalStepId,
      designId: d1.id,
      type: 'COMMIT_QUOTE'
    });
  });
  const [res, body] = await get(
    `/design-approval-steps/${approvalStepId}/stream-items`,
    {
      headers: authHeader(designer.session.id)
    }
  );
  t.equal(res.status, 200, 'Returns successfully');
  t.equal(body.length, 4, 'Returns 4 results');
  t.equal(body[0].text, 'Going to submit');
  t.deepEqual(
    {
      type: body[1].type,
      actorId: body[1].actorId,
      actorName: body[1].actorName,
      actorRole: body[1].actorRole
    },
    {
      type: 'SUBMIT_DESIGN',
      actorId: designer.user.id,
      actorName: 'Q User',
      actorRole: 'USER'
    },
    'Submit event returns required information'
  );
  t.equal(body[2].text, 'Going to checkout');
  t.deepEqual(
    {
      type: body[3].type,
      actorId: body[3].actorId,
      actorName: body[3].actorName,
      actorRole: body[3].actorRole
    },
    {
      type: 'COMMIT_QUOTE',
      actorId: designer.user.id,
      actorName: 'Q User',
      actorRole: 'USER'
    },
    'Checkout event returns required information'
  );

  const other = await createUser();
  const [unauthRes] = await get(
    `/design-approval-steps/${approvalStepId}/stream-items`,
    {
      headers: authHeader(other.session.id)
    }
  );
  t.equal(unauthRes.status, 403);
});
