import * as PromoCodesDAO from './dao';
import applyCode from './apply-code';
import createUser = require('../../test-helpers/create-user');
import { getCreditAmount } from '../credits/dao';
import { sandbox, test, Test } from '../../test-helpers/fresh';

test('applyCode applies a code', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  await PromoCodesDAO.create({
    code: 'FREEBIE',
    codeExpiresAt: null,
    createdBy: user.id,
    creditAmountCents: 1239,
    creditExpiresAt: null
  });

  await applyCode(user.id, 'freebie');

  t.equal(await getCreditAmount(user.id), 1239);
});

test('applyCode does not apply an expired code', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  await PromoCodesDAO.create({
    code: 'FREEBIE',
    codeExpiresAt: new Date(Date.now() - 1000),
    createdBy: user.id,
    creditAmountCents: 1239,
    creditExpiresAt: null
  });

  try {
    await applyCode(user.id, 'freebie');
    t.fail('Should not have applied code');
  } catch (err) {
    t.equal(err.message, 'Invalid promo code: freebie');
  }

  t.equal(await getCreditAmount(user.id), 0);
});

test('applyCode applies an expiring amount of credit', async (t: Test) => {
  const clock = sandbox().useFakeTimers();

  const { user } = await createUser({ withSession: false });

  await PromoCodesDAO.create({
    code: 'FREEBIE',
    codeExpiresAt: null,
    createdBy: user.id,
    creditAmountCents: 1239,
    creditExpiresAt: new Date(Date.now() + 1000)
  });

  await applyCode(user.id, 'freebie');

  t.equal(await getCreditAmount(user.id), 1239);
  clock.tick(1001);
  t.equal(await getCreditAmount(user.id), 0);
});