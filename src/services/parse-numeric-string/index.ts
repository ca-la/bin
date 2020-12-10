// Parse a numeric string to a JavaScript Number — for cases when we're working
// with potential unsafe or large-value numeric data, but don't want to use a
// BigInt.
export default function parseNumericString(intString: string): number {
  const parsed = Number(intString);

  if (intString === "" || Number.isNaN(parsed)) {
    throw new Error(`"${intString}" is not a number, cannot parse it`);
  }

  if (parsed > Number.MAX_SAFE_INTEGER || parsed < Number.MIN_SAFE_INTEGER) {
    throw new Error(
      `${intString} is outside the safe Number range, cannot parse it`
    );
  }

  return parsed;
}
