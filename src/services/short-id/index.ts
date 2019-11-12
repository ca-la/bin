import Hashids from 'hashids';

import { SHORT_ID_SALT } from '../../config';
import sequenceIncrement from '../sequence-increment';

const MIN_HASH_LENGTH = 8;
const TABLE_NAME = 'short_id_increment';

/**
 * Computes a unique short id based off a sequence in the database.
 */
export async function computeUniqueShortId(): Promise<string> {
  const hasher = new Hashids(SHORT_ID_SALT, MIN_HASH_LENGTH);
  const increment = await sequenceIncrement(TABLE_NAME);
  return hasher.encode(increment);
}
