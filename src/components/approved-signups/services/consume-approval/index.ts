import { ApprovedSignup } from '../../domain-object';
import { update } from '../../dao';

/**
 * Sets the instance as "consumed."
 * @param signup An ApprovedSignup instance
 */
export default async function consumeApproval(
  signup: ApprovedSignup
): Promise<ApprovedSignup> {
  return await update({ ...signup, consumedAt: new Date() });
}
