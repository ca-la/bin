import CollectionDb from "../../domain-object";
import { findSubmittedButUnpaidCollections } from "../../dao";
import {
  determineSubmissionStatus,
  getDesignsMetaByCollection,
} from "../determine-submission-status";
import { ProductDesignDataWithMeta } from "../../../product-designs/domain-objects/with-meta";
import { PricingCostInputDb } from "../../../pricing-cost-inputs/domain-object";

interface CollectionWithLabels extends CollectionDb {
  label: string;
}

/**
 * Returns a list of all collections that need to be costed.
 */
export async function fetchUncostedWithLabels(): Promise<
  CollectionWithLabels[]
> {
  const collections = await findSubmittedButUnpaidCollections();
  const labelledCollections: CollectionWithLabels[] = [];
  const collectionStatuses = await determineSubmissionStatus(
    collections.map((collection: CollectionDb): string => collection.id)
  );

  for (const collection of collections) {
    const status = collectionStatuses[collection.id];

    if (status.isSubmitted && !status.isCosted) {
      labelledCollections.push({ ...collection, label: "Needs Costing" });
    }
  }

  return labelledCollections;
}

/**
 * Returns a list of all collections which were costed and expired
 */
export async function fetchExpiredWithLabels(): Promise<
  CollectionWithLabels[]
> {
  const collections = await findSubmittedButUnpaidCollections();
  const labelledCollections: CollectionWithLabels[] = [];

  const designsByCollection = await getDesignsMetaByCollection(
    collections.map((collection: CollectionDb): string => collection.id)
  );

  for (const collection of collections) {
    const hasDesignWithNoInputs = designsByCollection[collection.id].some(
      (design: ProductDesignDataWithMeta) => !design.costInputs.length
    );
    if (hasDesignWithNoInputs) {
      continue;
    }
    const hasNotExpiredInput = designsByCollection[
      collection.id
    ].some((design: ProductDesignDataWithMeta) =>
      design.costInputs.some(
        (costInput: PricingCostInputDb) =>
          costInput.expiresAt && new Date(costInput.expiresAt) > new Date()
      )
    );
    if (hasNotExpiredInput) {
      continue;
    }
    labelledCollections.push({ ...collection, label: "Expired" });
  }

  return labelledCollections;
}
