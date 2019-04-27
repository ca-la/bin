import * as Koa from 'koa';

import { UserIO } from '../../components/users/domain-object';
import { findByEmail, findById } from '../../components/approved-signups/dao';
import { ApprovedSignup } from '../../components/approved-signups/domain-object';
import consumeApproval from '../../components/approved-signups/services/consume-approval';

export function* canCreateAccount(
  this: Koa.Application.Context<UserIO>,
  next: () => Promise<any>
): any {
  const { email } = this.request.body;
  const { approvedSignupId } = this.query;

  if (!email) {
    return this.throw(400, 'An email must be provided!');
  }

  let approvedSignup: ApprovedSignup | null = null;

  if (approvedSignupId) {
    approvedSignup = yield findById(approvedSignupId);
  } else {
    approvedSignup = yield findByEmail(email);
  }

  if (!approvedSignup) {
    return this.throw(403, 'Sorry, this email address is not approved');
  }

  if (approvedSignup.consumedAt) {
    return this.throw(403, 'Sorry, this email registration was already used');
  }

  yield consumeApproval(approvedSignup);

  yield next;
}