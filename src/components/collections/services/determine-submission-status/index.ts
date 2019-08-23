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

export interface SubmissionStatusByCollection {
  [collectionId: string]: CollectionSubmissionStatus;
}

interface DesignsByCollection {
  [collectionId: string]: ProductDesignDataWithMeta[];
}

function determineStatusFromDesigns(
  collectionId: string,
  designs: ProductDesignDataWithMeta[]
): CollectionSubmissionStatus {
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

/**
 * Determines the submission status for each collection.
 */
export async function determineSubmissionStatus(
  collectionIds: string[]
): Promise<SubmissionStatusByCollection> {
  const designsWithMeta = await findAllWithCostsAndEvents(collectionIds);
  const designsByCollection: DesignsByCollection = {};
  const submissionStatusByCollection: SubmissionStatusByCollection = {};

  for (const designWithMeta of designsWithMeta) {
    const { collectionId } = designWithMeta;
    const designList = designsByCollection[collectionId] || [];
    designsByCollection[collectionId] = [...designList, designWithMeta];
  }

  for (const collectionId of collectionIds) {
    submissionStatusByCollection[collectionId] = determineStatusFromDesigns(
      collectionId,
      designsByCollection[collectionId] || []
    );
  }

  return submissionStatusByCollection;
}
