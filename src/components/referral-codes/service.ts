import Hashids from "hashids";

import { REFERRAL_CODE_SALT } from "../../config";
import sequenceIncrement from "../../services/sequence-increment";

const MIN_HASH_LENGTH = 5;
const TABLE_NAME = "referral_code_increment";

const HASH_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export async function generateReferralCode(): Promise<string> {
  const hasher = new Hashids(
    REFERRAL_CODE_SALT,
    MIN_HASH_LENGTH,
    HASH_ALPHABET
  );
  const increment = await sequenceIncrement(TABLE_NAME);
  return hasher.encode(increment);
}
