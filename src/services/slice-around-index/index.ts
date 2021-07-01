export function sliceAroundIndex<T>({
  array,
  index,
  limit,
}: {
  array: T[];
  index: number;
  limit: number;
}): T[] {
  const desiredRightIndex = index + limit / 2;
  const actualRightIndex = Math.min(array.length, desiredRightIndex);

  const desiredLeftIndex = index - limit / 2;
  const actualLeftIndex = Math.max(0, desiredLeftIndex);

  return array.slice(
    Math.max(
      0,
      Math.ceil(actualLeftIndex - (desiredRightIndex - actualRightIndex))
    ),
    Math.min(
      array.length,
      Math.ceil(actualRightIndex - (desiredLeftIndex - actualLeftIndex))
    )
  );
}
