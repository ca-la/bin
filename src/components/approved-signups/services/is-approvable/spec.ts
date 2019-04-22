import { test, Test } from '../../../../test-helpers/fresh';
import isApprovable from './index';

test('isApprovable can determine if a signup form has the right answers', async (t: Test) => {
  t.true(isApprovable('150+', 'NO'));
  t.true(isApprovable('150+', 'YES'));
  t.true(isApprovable('50-150', 'YES'));
  t.false(isApprovable('50-150', 'NO'));
  t.false(isApprovable('10-50', 'YES'));
  t.false(isApprovable('0-10', 'NO'));
});
