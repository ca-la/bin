import { test, Test } from '../../../../test-helpers/fresh';
import isApprovable from './index';

test('isApprovable can determine if a signup form has the right answers', async (t: Test) => {
  t.true(isApprovable('150_PLUS'));
  t.false(isApprovable('50_TO_150'));
  t.false(isApprovable('10_TO_50'));
  t.false(isApprovable('0_TO_10'));
});
