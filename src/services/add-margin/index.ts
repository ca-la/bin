/**
 * A method to add a fixed margin amount to a base number using a specific formula.
 *
 * @param {number} base Base number to add margin token
 * @param {number} margin Margin to add where `0.06` is `6%`
 */
export default function addMargin(base: number, margin: number): number {
  if (margin >= 1) {
    throw new TypeError("Cannot add a margin greater than 100%");
  }

  return Math.ceil(base / (1 - margin));
}
