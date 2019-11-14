import db from '../../../services/db';
import { compare } from '../../../services/hash';
import { UserRow } from '../domain-object';
import { first } from 'lodash';

export async function validatePassword(
  userId: string,
  password: string
): Promise<boolean> {
  const user = await db('users')
    .where({ id: userId })
    .then((users: UserRow[]) => first<UserRow>(users));

  if (!user) {
    return false;
  }
  return compare(password, user.password_hash);
}
