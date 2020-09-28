import Hashids from "hashids";

import { UPC_SALT } from "../../config";
import sequenceIncrement from "../sequence-increment";

const HASH_LENGTH = 8;
const HASH_ALPHABET = "0123456789abcdef";
const UNCHECKED_UPC_LENGTH = 10;
const TABLE_NAME = "universal_product_code_increment";
// This prefix enables us to safely ignore our existing barcodes so that
// there are no collisions possible with the previous manual process
const UPC_PREFIX = "9";

// Calulate the checksum digit
// https://en.wikipedia.org/wiki/Universal_Product_Code#Check_digit_calculation
export function getChecksum(checkNumber: string): number {
  if (checkNumber.length !== 11) {
    throw new Error("Unchecked UPC requires 11 digits.");
  }

  const result = checkNumber
    .split("")
    .reduce((acc: number, char: string, index: number): number => {
      if (index % 2 === 0) {
        return acc + parseInt(char, 10) * 3;
      }
      return acc + parseInt(char, 10);
    }, 0);

  return (10 - (result % 10)) % 10;
}

/**
 * Computes a unique UPC based off a sequence in the database.
 */
export async function computeUniqueUpc(): Promise<string> {
  const hasher = new Hashids(UPC_SALT, HASH_LENGTH, HASH_ALPHABET);
  const increment = await sequenceIncrement(TABLE_NAME);

  const hex = hasher.encode(increment);
  const upcNumber = parseInt(hex, 16);
  const upcWithLeadingZeros = "0000000000" + upcNumber.toString(10);

  const uncheckedUPC =
    UPC_PREFIX +
    upcWithLeadingZeros.substring(
      upcWithLeadingZeros.length - UNCHECKED_UPC_LENGTH
    );

  const checkSum = getChecksum(uncheckedUPC);
  return uncheckedUPC + checkSum.toString(10);
}
