import { test, Test } from '../../test-helpers/simple';
import { dataAdapter } from './domain-object';

test('dataAdpater.parse', async (t: Test) => {
  t.deepEqual(
    dataAdapter.parse({
      id: 's1',
      design_id: 'd1',
      ordering: 0,
      reason: 'Awaiting something',
      state: 'BLOCKED',
      title: 'A step'
    }),
    {
      id: 's1',
      designId: 'd1',
      ordering: 0,
      reason: 'Awaiting something',
      state: 'BLOCKED',
      title: 'A step'
    },
    'parses a valid blocked row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        ordering: 0,
        reason: null,
        state: 'BLOCKED',
        title: 'A step'
      }),
    'throws on invalid blocked row'
  );

  t.deepEqual(
    dataAdapter.parse({
      id: 's1',
      design_id: 'd1',
      ordering: 0,
      reason: null,
      state: 'UNSTARTED',
      title: 'A step'
    }),
    {
      id: 's1',
      designId: 'd1',
      ordering: 0,
      reason: null,
      state: 'UNSTARTED',
      title: 'A step'
    },
    'parses a valid unstarted row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        ordering: 0,
        reason: 'Should not be here',
        state: 'UNSTARTED',
        title: 'A step'
      }),
    'throws on invalid unstarted row'
  );

  t.deepEqual(
    dataAdapter.parse({
      id: 's1',
      design_id: 'd1',
      ordering: 0,
      reason: null,
      state: 'CURRENT',
      title: 'A step'
    }),
    {
      id: 's1',
      designId: 'd1',
      ordering: 0,
      reason: null,
      state: 'CURRENT',
      title: 'A step'
    },
    'parses a valid current row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        ordering: 0,
        reason: 'Should not be here',
        state: 'CURRENT',
        title: 'A step'
      }),
    'throws on invalid current row'
  );

  t.deepEqual(
    dataAdapter.parse({
      id: 's1',
      design_id: 'd1',
      ordering: 0,
      reason: null,
      state: 'COMPLETED',
      title: 'A step'
    }),
    {
      id: 's1',
      designId: 'd1',
      ordering: 0,
      reason: null,
      state: 'COMPLETED',
      title: 'A step'
    },
    'parses a valid completed row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        ordering: 0,
        reason: 'Should not be here',
        state: 'COMPLETED',
        title: 'A step'
      }),
    'throws on invalid completed row'
  );

  t.deepEqual(
    dataAdapter.parse({
      id: 's1',
      design_id: 'd1',
      ordering: 0,
      reason: null,
      state: 'SKIP',
      title: 'A step'
    }),
    {
      id: 's1',
      designId: 'd1',
      ordering: 0,
      reason: null,
      state: 'SKIP',
      title: 'A step'
    },
    'parses a valid skip row'
  );

  t.throws(
    () =>
      dataAdapter.parse({
        id: 's1',
        design_id: 'd1',
        ordering: 0,
        reason: 'Should not be here',
        state: 'SKIP',
        title: 'A step'
      }),
    'throws on invalid skip row'
  );
});
