import Knex from "knex";
import { HermesMessage, HermesMessageType } from "@cala/ts-lib";

import { sendMessage } from "../../components/hermes/send-message";
import { findByUserId } from "../../components/storefronts/dao";
import { findByCollectionId } from "../../components/product-designs/dao";
import ProductDesign from "../../components/product-designs/domain-objects/product-design";

export async function createShopifyProductsForCollection(
  trx: Knex.Transaction,
  userId: string,
  collectionId: string
): Promise<void> {
  const storefront = await findByUserId({ userId, trx });
  if (!storefront) {
    return;
  }

  const designs: ProductDesign[] = await findByCollectionId(collectionId, trx);
  if (designs.length === 0) {
    throw new Error(`No designs found in Collection ${collectionId}`);
  }
  designs.forEach((design: ProductDesign): void => {
    const resource: HermesMessage = {
      type: HermesMessageType.SHOPIFY_PRODUCT_CREATE,
      designId: design.id,
      storefrontId: storefront.id,
    };
    sendMessage(resource);
  });
}
