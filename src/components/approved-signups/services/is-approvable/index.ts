/**
 * Returns true if the value is 150_PLUS or 50_to_150.
 * @param howManyUnitsPerStyle a string representing the response to "How many units per style?"
 */
export default function isApprovable(howManyUnitsPerStyle: string): boolean {
  if (
    howManyUnitsPerStyle === '150_PLUS' ||
    howManyUnitsPerStyle === '50_TO_150'
  ) {
    return true;
  }

  return false;
}
