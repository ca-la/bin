import { findAllWithCostsAndEvents } from '../../../product-designs/dao/dao';
import {
  DesignState,
  determineState
} from '../../../product-designs/services/state-machine';
import { ProductDesignDataWithMeta } from '../../../product-designs/domain-objects/with-meta';
import { determineEarliestExpiration } from '../../../pricing-cost-inputs/services/determine-earliest-expiration';
import { BasePricingCostInput } from '../../../pricing-cost-inputs/domain-object';

export interface CollectionSubmissionStatus {
  collectionId: string;
  isSubmitted: boolean;
  isCosted: boolean;
  isQuoted: boolean;
  isPaired: boolean;
  pricingExpiresAt: Date | null;
}

/**
 * Determines the submission status for a given collection.
 */
export async function determineSubmissionStatus(
  collectionId: string
): Promise<CollectionSubmissionStatus> {
  const designs = await findAllWithCostsAndEvents(collectionId);
  const hasDesigns = designs.length > 0;
  const designStates: DesignState[] = designs.map(
    (design: ProductDesignDataWithMeta) => determineState(design)
  );
  const isPaired = designStates.every(
    (state: DesignState): boolean => state === DesignState.PAIRED
  );
  const isQuoted = designStates.every(
    (state: DesignState): boolean =>
      [DesignState.PAIRED, DesignState.CHECKED_OUT].includes(state)
  );
  const isCosted = designStates.every(
    (state: DesignState): boolean =>
      [
        DesignState.PAIRED,
        DesignState.CHECKED_OUT,
        DesignState.COSTED
      ].includes(state)
  );
  const isSubmitted = designStates.every(
    (state: DesignState): boolean =>
      [
        DesignState.PAIRED,
        DesignState.CHECKED_OUT,
        DesignState.COSTED,
        DesignState.SUBMITTED
      ].includes(state)
  );
  const pricingExpiresAt = determineEarliestExpiration(
    designs.reduce(
      (
        aggregate: BasePricingCostInput[],
        currentDesign: ProductDesignDataWithMeta
      ): BasePricingCostInput[] => {
        return [...aggregate, ...currentDesign.costInputs];
      },
      []
    )
  );

  return {
    collectionId,
    isSubmitted: hasDesigns && isSubmitted,
    isCosted: hasDesigns && isCosted,
    isQuoted: hasDesigns && isQuoted,
    isPaired: hasDesigns && isPaired,
    pricingExpiresAt
  };
}
