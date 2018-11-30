export type Cents = number;

export function Dollars(dollars: number): Cents {
  return dollars * 100;
}
