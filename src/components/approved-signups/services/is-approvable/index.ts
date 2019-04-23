/**
 * Returns true if the value is 150_PLUS.
 * @param howManyUnitsPerStyle a string representing the response to "How many units per style?"
 */
export default function isApprovable(howManyUnitsPerStyle: string): boolean {
  if (howManyUnitsPerStyle === '150_PLUS') {
    return true;
  }

  return false;
}
