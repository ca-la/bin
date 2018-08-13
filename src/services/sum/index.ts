export default function sum(addends: number[]): number {
  return addends
    .reduce(
      (summation: number, addend: number) => summation + addend,
      0
    );
}
