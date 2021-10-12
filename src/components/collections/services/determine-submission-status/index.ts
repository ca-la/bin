import Knex from "knex";

import { findAllWithCostsAndEvents } from "../../../product-designs/dao/dao";
import {
  DesignState,
  determineState,
} from "../../../product-designs/services/state-machine";
import { ProductDesignDataWithMeta } from "../../../product-designs/domain-objects/with-meta";
import { determineEarliestExpiration } from "../../../pricing-cost-inputs/services/determine-earliest-expiration";
import { PricingCostInputDb } from "../../../pricing-cost-inputs/domain-object";
import { CollectionSubmissionStatus } from "../../types";

export interface SubmissionStatusByCollection {
  [collectionId: string]: CollectionSubmissionStatus;
}

interface DesignsByCollection {
  [collectionId: string]: ProductDesignDataWithMeta[];
}

export function determineStatusFromDesigns(
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
        aggregate: PricingCostInputDb[],
        currentDesign: ProductDesignDataWithMeta
      ): PricingCostInputDb[] => {
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
  collectionIds: string[],
  trx?: Knex.Transaction
): Promise<DesignsByCollection> {
  const designsWithMeta = await findAllWithCostsAndEvents(collectionIds, trx);
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
  collectionIds: string[],
  trx?: Knex.Transaction
): Promise<SubmissionStatusByCollection> {
  const designsByCollection = await getDesignsMetaByCollection(
    collectionIds,
    trx
  );
  const submissionStatusByCollection: SubmissionStatusByCollection = {};

  for (const collectionId of collectionIds) {
    submissionStatusByCollection[collectionId] = determineStatusFromDesigns(
      collectionId,
      designsByCollection[collectionId] || []
    );
  }

  return submissionStatusByCollection;
}
