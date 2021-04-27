import Knex from "knex";
import uuid from "node-uuid";
import { HermesMessageType, ProviderName } from "@cala/ts-lib";
import * as HermesService from "../../components/hermes/send-message";
import * as CollectionsDAO from "../../components/collections/dao";
import createUser from "../../test-helpers/create-user";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { createStorefront } from "../create-storefront";
import db from "../db";
import { createShopifyProductsForCollection } from ".";
import createDesign from "../create-design";

test("createShopifyProductsForCollection creates a Hermes message for each design", async (t: Test) => {
  const sendMessageStub = sandbox()
    .stub(HermesService, "sendMessage")
    .resolves();

  const { user } = await createUser();
  const storefront = await createStorefront({
    userId: user.id,
    accessToken: "token-foo",
    name: "The Gift Shop",
    baseUrl: "gift.shop",
    providerName: ProviderName.SHOPIFY,
  });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });
  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
    collectionIds: [collection.id],
  });

  const design2 = await createDesign({
    productType: "A product type",
    title: "A design 2",
    userId: user.id,
    collectionIds: [collection.id],
  });
  await db.transaction((trx: Knex.Transaction) =>
    createShopifyProductsForCollection(trx, user.id, collection.id)
  );

  t.deepEqual(sendMessageStub.firstCall.args[0], {
    storefrontId: storefront.id,
    designId: design2.id,
    type: HermesMessageType.SHOPIFY_PRODUCT_CREATE,
  });
  t.deepEqual(sendMessageStub.secondCall.args[0], {
    storefrontId: storefront.id,
    designId: design.id,
    type: HermesMessageType.SHOPIFY_PRODUCT_CREATE,
  });
});
