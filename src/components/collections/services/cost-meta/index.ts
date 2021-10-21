import Knex from "knex";

import {
  Collection,
  CartDetailsCollection,
  CostedCollectionCartDetail,
  SubmittedCollectionCartDetail,
} from "../../types";
import * as CollectionsDAO from "../../dao";
import * as VariantsDAO from "../../../product-design-variants/dao";
import { CreateQuotePayload } from "../../../../services/generate-pricing-quote";
import { calculateSubtotal } from "../../../design-quotes/service";
import {
  determineSubmissionStatus,
  SubmissionStatusByCollection,
} from "../determine-submission-status";

async function getCostedCollectionCartDetails(
  ktx: Knex,
  collection: Omit<Collection, "permissions">
): Promise<CostedCollectionCartDetail> {
  const designVariants = await VariantsDAO.findByCollectionId(
    collection.id,
    ktx
  );

  const quoteRequestMap = new Map<string, CreateQuotePayload>();
  for (const variant of designVariants) {
    const designId = variant.designId;
    const quotePayload = quoteRequestMap.get(designId);

    if (quotePayload) {
      quoteRequestMap.set(designId, {
        designId,
        units: quotePayload.units + variant.unitsToProduce,
      });
    } else {
      quoteRequestMap.set(designId, {
        designId,
        units: variant.unitsToProduce,
      });
    }
  }

  const quoteRequests: CreateQuotePayload[] = Array.from(
    quoteRequestMap.values()
  );
  const collectionCartSubtotal = await calculateSubtotal(ktx, quoteRequests);

  return {
    ...collection,
    cartStatus: "COSTED",
    cartSubtotal: collectionCartSubtotal,
  };
}

export async function getCostedAndSubmittedCollections(
  ktx: Knex,
  options: {
    userId: string;
    role: string;
  }
): Promise<CartDetailsCollection[]> {
  const userCollections = await CollectionsDAO.findByUser(ktx, {
    userId: options.userId,
    sessionRole: options.role,
  });
  const collectionIds = userCollections.map(
    (collection: Collection): string => collection.id
  );
  const submissionStatusByCollection: SubmissionStatusByCollection = await determineSubmissionStatus(
    collectionIds
  );

  const costedCollections = userCollections.filter((collection: Collection) => {
    const status = submissionStatusByCollection[collection.id];
    return status.isCosted && !status.isQuoted;
  });

  const costedCollectionCartDetails: CostedCollectionCartDetail[] = [];
  for (const collection of costedCollections) {
    const costedCollection = await getCostedCollectionCartDetails(
      ktx,
      collection
    );
    costedCollectionCartDetails.push(costedCollection);
  }

  const submittedCollections = userCollections.filter(
    (collection: Collection) => {
      const status = submissionStatusByCollection[collection.id];
      return status.isSubmitted && !status.isCosted;
    }
  );

  const submittedCollectionCartDetails: SubmittedCollectionCartDetail[] = submittedCollections.map(
    (collection: Collection) => {
      return {
        ...collection,
        cartStatus: "SUBMITTED",
      };
    }
  );

  return [...costedCollectionCartDetails, ...submittedCollectionCartDetails];
}

export async function getCollectionCartDetails(
  ktx: Knex,
  collectionId: string
): Promise<CartDetailsCollection | null> {
  const collectionDb = await CollectionsDAO.findById(collectionId, ktx);
  if (!collectionDb) {
    return null;
  }

  const submissionStatusByCollection: SubmissionStatusByCollection = await determineSubmissionStatus(
    [collectionId],
    ktx
  );

  const collectionStatus = submissionStatusByCollection[collectionId];
  const isCosted = collectionStatus.isCosted && !collectionStatus.isQuoted;
  const isSubmitted =
    collectionStatus.isSubmitted && !collectionStatus.isCosted;

  if (!isSubmitted && !isCosted) {
    return null;
  }

  const collection = {
    ...collectionDb,
    designs: CollectionsDAO.convertCollectionDesignsDbMetaToDesignMeta(
      collectionDb.designs
    ),
  };

  if (isSubmitted) {
    return {
      ...collection,
      cartStatus: "SUBMITTED",
    };
  }

  if (isCosted) {
    const costedCollection = await getCostedCollectionCartDetails(
      ktx,
      collection
    );

    return costedCollection;
  }

  return null;
}
