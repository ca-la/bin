import { findAllWithCostsAndEvents } from "../../../product-designs/dao/dao";
import {
  DesignState,
  determineState,
} from "../../../product-designs/services/state-machine";
import { ProductDesignDataWithMeta } from "../../../product-designs/domain-objects/with-meta";
import { determineEarliestExpiration } from "../../../pricing-cost-inputs/services/determine-earliest-expiration";
import { BasePricingCostInput } from "../../../pricing-cost-inputs/domain-object";
import { CollectionSubmissionStatus } from "../../types";

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
  const isQuoted = designStates.every((state: DesignState): boolean =>
    [DesignState.PAIRED, DesignState.CHECKED_OUT].includes(state)
  );
  const isCosted = designStates.every((state: DesignState): boolean =>
    [DesignState.PAIRED, DesignState.CHECKED_OUT, DesignState.COSTED].includes(
      state
    )
  );
  const isSubmitted = designStates.every((state: DesignState): boolean =>
    [
      DesignState.PAIRED,
      DesignState.CHECKED_OUT,
      DesignState.COSTED,
      DesignState.SUBMITTED,
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
    pricingExpiresAt,
  };
}

export async function getDesignsMetaByCollection(
  collectionIds: string[]
): Promise<DesignsByCollection> {
  const designsWithMeta = await findAllWithCostsAndEvents(collectionIds);
  const designsByCollection: DesignsByCollection = {};
  for (const designWithMeta of designsWithMeta) {
    const { collectionId } = designWithMeta;
    const designList = designsByCollection[collectionId] || [];
    designsByCollection[collectionId] = [...designList, designWithMeta];
  }
  return designsByCollection;
}

/**
 * Determines the submission status for each collection.
 */
export async function determineSubmissionStatus(
  collectionIds: string[]
): Promise<SubmissionStatusByCollection> {
  const designsByCollection = await getDesignsMetaByCollection(collectionIds);
  const submissionStatusByCollection: SubmissionStatusByCollection = {};

  for (const collectionId of collectionIds) {
    submissionStatusByCollection[collectionId] = determineStatusFromDesigns(
      collectionId,
      designsByCollection[collectionId] || []
    );
  }

  return submissionStatusByCollection;
}
