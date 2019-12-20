import { HermesMessage, HermesMessageType } from '@cala/ts-lib';
import { sendMessage } from '../../components/hermes/send-message';
import { findByUserId } from '../../components/storefronts/dao';
import db from '../db';
import { findByCollectionId } from '../../components/product-designs/dao';
import ProductDesign from '../../components/product-designs/domain-objects/product-design';
import Knex from 'knex';

export async function createShopifyProductsForCollection(
  userId: string,
  collectionId: string
): Promise<void> {
  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const storefront = await findByUserId({ userId, trx });
      if (!storefront) {
        return;
      }

      const designs: ProductDesign[] = await findByCollectionId(
        collectionId,
        trx
      );
      if (designs.length === 0) {
        throw new Error(`No designs found in Collection ${collectionId}`);
      }
      designs.forEach(
        (design: ProductDesign): void => {
          const resource: HermesMessage = {
            type: HermesMessageType.SHOPIFY_PRODUCT_CREATE,
            designId: design.id,
            storefrontId: storefront.id
          };
          sendMessage(resource);
        }
      );
    }
  );
}
