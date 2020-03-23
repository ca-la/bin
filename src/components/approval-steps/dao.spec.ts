import Knex from 'knex';
import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import { test, Test } from '../../test-helpers/fresh';
import { generateDesign } from '../../test-helpers/factories/product-design';
import db from '../../services/db';
import ProductDesign from '../product-designs/domain-objects/product-design';

import ApprovalStep from './domain-object';
import * as ApprovalStepsDAO from './dao';
import createUser from '../../test-helpers/create-user';

// Temporary workout for backwards compatible change
function withoutState(step: ApprovalStep): ApprovalStep {
  return omit(step, 'state') as ApprovalStep;
}

test('ApprovalStepsDAO can create multiple steps and retrieve by design', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await generateDesign({ id: 'd1', userId: user.id });
  const d2: ProductDesign = await generateDesign({ id: 'd2', userId: user.id });

  const as1: ApprovalStep = {
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d1.id
  };
  const as2: ApprovalStep = {
    id: uuid.v4(),
    title: 'Technical Design',
    ordering: 1,
    designId: d1.id
  };
  const as3: ApprovalStep = {
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d2.id
  };
  const as4: ApprovalStep = {
    id: uuid.v4(),
    title: 'Technical Design',
    ordering: 1,
    designId: d2.id
  };

  const created = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [as1, as2, as3, as4])
  );

  t.deepEqual(
    created.map(withoutState),
    [as1, as2, as3, as4],
    'returns inserted steps'
  );

  const found = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, d1.id)
  );

  t.deepEqual(found.map(withoutState), [as1, as2], 'returns steps by design');
});
