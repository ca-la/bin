import * as uuid from 'node-uuid';

import { ApprovedSignup } from '../../domain-object';
import { create, findByEmail } from '../../dao';

/**
 * Either finds or creates an approved signup row.
 * @param data An unsaved approved signup
 */
export default async function findOrCreate(
  data: Unsaved<ApprovedSignup>
): Promise<ApprovedSignup> {
  const foundByEmail = await findByEmail(data.email);
  if (foundByEmail) {
    return foundByEmail;
  }

  const newSignup = await create({
    ...data,
    createdAt: new Date(),
    id: uuid.v4()
  });
  return newSignup;
}
