import { BasePricingCostInput } from "../domain-object";

/**
 * From a list of cost inputs, determines which one expires earliest.
 * Algorithm
 *  - Filters out all cost inputs that have already expired.
 *  - Walks through the list to find the cost input that expires soonest.
 *  - Returns the soonest expiration date (or null if none expire).
 */
export function determineEarliestExpiration(
  costInputs: BasePricingCostInput[]
): Date | null {
  return costInputs
    .filter((costInput: BasePricingCostInput): boolean => {
      return costInput.expiresAt === null
        ? true
        : new Date(costInput.expiresAt) > new Date();
    })
    .reduce(
      (
        previousValue: Date | null,
        currentValue: BasePricingCostInput
      ): Date | null => {
        if (currentValue.expiresAt && !previousValue) {
          return new Date(currentValue.expiresAt);
        }

        if (currentValue.expiresAt && previousValue) {
          const currentExpiry = new Date(currentValue.expiresAt);
          return currentExpiry < previousValue ? currentExpiry : previousValue;
        }

        return previousValue;
      },
      null
    );
}
