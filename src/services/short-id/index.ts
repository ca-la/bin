import Hashids from 'hashids';
import db = require('../db');
import rethrow = require('pg-rethrow');

import { SHORT_ID_SALT } from '../../config';

const MIN_HASH_LENGTH = 8;
const TABLE_NAME = 'short_id_increment';

/**
 * Selects the next increment from the database.
 */
export async function retrieveIncrement(): Promise<number> {
  const increment = await db
    .raw(`SELECT nextval('${TABLE_NAME}');`)
    .then((result: any): number => result.rows[0].nextval)
    .catch(rethrow);

  if (!increment) {
    throw new Error('Increment could not be found!');
  }

  return increment;
}

/**
 * Computes a unique short id based off a sequence in the database.
 */
export async function computeUniqueShortId(): Promise<string> {
  const hasher = new Hashids(SHORT_ID_SALT, MIN_HASH_LENGTH);
  const increment = await retrieveIncrement();
  return hasher.encode(increment);
}
