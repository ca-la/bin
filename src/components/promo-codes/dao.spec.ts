import * as PromoCodesDAO from './dao';
import createUser = require('../../test-helpers/create-user');
import { test, Test } from '../../test-helpers/fresh';

test('PromoCodesDAO supports creation and retrieval', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  await PromoCodesDAO.create({
    code: 'FREEBIE',
    codeExpiresAt: null,
    createdBy: user.id,
    creditAmountCents: 1239,
    creditExpiresAt: null
  });

  const code = await PromoCodesDAO.findByCode('freeBie');
  if (!code) { throw new Error('No code'); }
  t.equal(code.creditAmountCents, 1239);
});

test('PromoCodesDAO.findByCode returns null if not found', async (t: Test) => {
  const code = await PromoCodesDAO.findByCode('freeBie');
  t.equal(code, null);
});

test('PromoCodesDAO does not allow duplicate codes', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  await PromoCodesDAO.create({
    code: 'FREEBIE',
    codeExpiresAt: null,
    createdBy: user.id,
    creditAmountCents: 1239,
    creditExpiresAt: null
  });

  try {
    await PromoCodesDAO.create({
      code: 'freebie',
      codeExpiresAt: null,
      createdBy: user.id,
      creditAmountCents: 1239,
      creditExpiresAt: null
    });
    t.fail('should not succeed');
  } catch (err) {
    t.equal(err.message, 'Promo code already exists');
  }
});
