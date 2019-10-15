import * as db from '../../services/db';

import UserOnboarding, {
  dataAdapter,
  isUserOnboardingRow,
  UserOnboardingRow
} from './domain-object';
import { validate } from '../../services/validate-from-db';
import first from '../../services/first';

const TABLE_NAME = 'user_onboardings';

async function update(data: UserOnboarding): Promise<UserOnboarding> {
  const rowData = dataAdapter.forInsertion(data);

  const user = await db(TABLE_NAME)
    .where({ user_id: data.userId })
    .update(rowData, '*')
    .then((rows: UserOnboardingRow[]) => first<UserOnboardingRow>(rows));

  return validate<UserOnboardingRow, UserOnboarding>(
    TABLE_NAME,
    isUserOnboardingRow,
    dataAdapter,
    user
  );
}

export async function create(data: UserOnboarding): Promise<UserOnboarding> {
  const rowData = dataAdapter.forInsertion(data);

  const existingOnboarding = await findByUserId(data.userId);
  if (existingOnboarding) {
    return update(data);
  }

  const userOnboardings: UserOnboardingRow[] = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*');

  const userOnboarding = userOnboardings[0];

  if (!userOnboarding) {
    throw new Error('There was a problem saving the comment');
  }

  return validate<UserOnboardingRow, UserOnboarding>(
    TABLE_NAME,
    isUserOnboardingRow,
    dataAdapter,
    userOnboarding
  );
}

export async function findByUserId(
  userId: string
): Promise<UserOnboarding | null> {
  const userOnboardingRow: UserOnboardingRow = await db(TABLE_NAME)
    .select('*')
    .where({ user_id: userId })
    .then((rows: UserOnboardingRow[]) => first<UserOnboardingRow>(rows));

  if (!userOnboardingRow) {
    return null;
  }

  return validate<UserOnboardingRow, UserOnboarding>(
    TABLE_NAME,
    isUserOnboardingRow,
    dataAdapter,
    userOnboardingRow
  );
}
