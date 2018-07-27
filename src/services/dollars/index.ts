export type Dollars = number;

export function Dollars(cents: number): Dollars {
  return cents * 100;
}
