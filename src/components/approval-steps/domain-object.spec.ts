import { test, Test } from '../../test-helpers/simple';
import { dataAdapter } from './domain-object';

test('dataAdpater.parse', async (t: Test) => {
  const now = new Date();
  t.deepEqual(
    dataAdapter.parse({
      id: 's1',
      design_id: 'd1',
      collaborator_id: 'c1',
      ordering: 0,
      reason: 'Awaiting something',
      state: 'BLOCKED',
      title: 'A step',
      type: 'CHECKOUT',
      created_at: now,
      started_at: null,
      completed_at: null
    }),
    {
      id: 's1',
      designId: 'd1',
      collaboratorId: 'c1',
      ordering: 0,
      reason: 'Awaiting something',
      state: 'BLOCKED',
      title: 'A step',
      type: 'CHECKOUT',
      createdAt: now,
      startedAt: null,
      completedAt: null
    },
    'parses a valid blocked row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        collaborator_id: 'c1',
        ordering: 0,
        reason: null,
        state: 'BLOCKED',
        title: 'A step',
        type: 'CHECKOUT',
        created_at: now,
        started_at: null,
        completed_at: null
      }),
    'throws on invalid blocked row'
  );

  t.deepEqual(
    dataAdapter.parse({
      id: 's1',
      design_id: 'd1',
      collaborator_id: 'c1',
      ordering: 0,
      reason: null,
      state: 'UNSTARTED',
      title: 'A step',
      type: 'CHECKOUT',
      created_at: now,
      started_at: null,
      completed_at: null
    }),
    {
      id: 's1',
      designId: 'd1',
      collaboratorId: 'c1',
      ordering: 0,
      reason: null,
      state: 'UNSTARTED',
      title: 'A step',
      type: 'CHECKOUT',
      createdAt: now,
      startedAt: null,
      completedAt: null
    },
    'parses a valid unstarted row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        collaborator_id: 'c1',
        ordering: 0,
        reason: 'Should not be here',
        state: 'UNSTARTED',
        title: 'A step',
        type: 'CHECKOUT',
        created_at: now,
        started_at: null,
        completed_at: null
      }),
    'throws on invalid unstarted row'
  );

  t.deepEqual(
    dataAdapter.parse({
      id: 's1',
      design_id: 'd1',
      collaborator_id: 'c1',
      ordering: 0,
      reason: null,
      state: 'CURRENT',
      title: 'A step',
      type: 'CHECKOUT',
      created_at: now,
      started_at: now,
      completed_at: null
    }),
    {
      id: 's1',
      designId: 'd1',
      collaboratorId: 'c1',
      ordering: 0,
      reason: null,
      state: 'CURRENT',
      title: 'A step',
      type: 'CHECKOUT',
      createdAt: now,
      startedAt: now,
      completedAt: null
    },
    'parses a valid current row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        collaborator_id: 'c1',
        ordering: 0,
        reason: 'Should not be here',
        state: 'CURRENT',
        title: 'A step',
        type: 'CHECKOUT',
        created_at: now,
        started_at: now,
        completed_at: null
      }),
    'throws on invalid reason current row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        collaborator_id: 'c1',
        ordering: 0,
        reason: null,
        state: 'CURRENT',
        title: 'A step',
        type: 'CHECKOUT',
        created_at: now,
        started_at: null,
        completed_at: null
      }),
    'throws on invalid date current row'
  );

  t.deepEqual(
    dataAdapter.parse({
      id: 's1',
      design_id: 'd1',
      collaborator_id: 'c1',
      ordering: 0,
      reason: null,
      state: 'COMPLETED',
      title: 'A step',
      type: 'CHECKOUT',
      created_at: now,
      started_at: now,
      completed_at: now
    }),
    {
      id: 's1',
      designId: 'd1',
      collaboratorId: 'c1',
      ordering: 0,
      reason: null,
      state: 'COMPLETED',
      title: 'A step',
      type: 'CHECKOUT',
      createdAt: now,
      startedAt: now,
      completedAt: now
    },
    'parses a valid completed row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        collaborator_id: 'c1',
        ordering: 0,
        reason: 'Should not be here',
        state: 'COMPLETED',
        title: 'A step',
        type: 'CHECKOUT',
        created_at: now,
        started_at: now,
        completed_at: now
      }),
    'throws on invalid reason completed row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        collaborator_id: 'c1',
        ordering: 0,
        reason: null,
        state: 'COMPLETED',
        title: 'A step',
        type: 'CHECKOUT',
        created_at: now,
        started_at: now,
        completed_at: null
      }),
    'throws on invalid date completed row'
  );

  t.deepEqual(
    dataAdapter.parse({
      id: 's1',
      design_id: 'd1',
      collaborator_id: 'c1',
      ordering: 0,
      reason: null,
      state: 'SKIP',
      title: 'A step',
      type: 'CHECKOUT',
      created_at: now,
      started_at: null,
      completed_at: null
    }),
    {
      id: 's1',
      designId: 'd1',
      collaboratorId: 'c1',
      ordering: 0,
      reason: null,
      state: 'SKIP',
      title: 'A step',
      type: 'CHECKOUT',
      createdAt: now,
      startedAt: null,
      completedAt: null
    },
    'parses a valid skip row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        collaborator_id: 'c1',
        ordering: 0,
        reason: 'Should not be here',
        state: 'SKIP',
        title: 'A step',
        type: 'CHECKOUT',
        created_at: now,
        started_at: null,
        completed_at: null
      }),
    'throws on invalid skip row'
  );
});
