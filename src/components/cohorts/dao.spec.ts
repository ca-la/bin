import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { test, Test } from '../../test-helpers/fresh';
import * as db from '../../services/db';
import createUser = require('../../test-helpers/create-user');

import * as CohortsDAO from './dao';

test('Cohorts DAO supports creation and retrieval', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const cohortId = uuid.v4();

  const created = await CohortsDAO.create({
    createdBy: user.id,
    description: 'A bunch of delightful designers',
    id: cohortId,
    slug: 'moma-demo-june-2020',
    title: 'MoMA Demo Participants'
  });

  const found = await CohortsDAO.findById(cohortId);
  const foundBySlug = await CohortsDAO.findBySlug('moma-demo-june-2020');

  t.deepEqual(created, found, 'Persists the cohort');
  t.deepEqual(created, foundBySlug, 'Is retrievable by slug');
});

test('Cohorts DAO supports creation and retrieval in a transaction', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const cohortId = uuid.v4();

  await db.transaction(async (trx: Knex.Transaction) => {
    const created = await CohortsDAO.create(
      {
        createdBy: user.id,
        description: 'A bunch of delightful designers',
        id: cohortId,
        slug: 'moma-demo-june-2020',
        title: 'MoMA Demo Participants'
      },
      trx
    );

    const found = await CohortsDAO.findById(cohortId, trx);
    const foundBySlug = await CohortsDAO.findBySlug('moma-demo-june-2020', trx);

    t.deepEqual(created, found, 'Persists the cohort');
    t.deepEqual(created, foundBySlug, 'Is retrievable by slug');
  });
});
