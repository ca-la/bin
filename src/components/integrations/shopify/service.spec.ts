import { sandbox, test, Test } from "../../../test-helpers/fresh";
import * as createShopifyProduct from "../../shopify-products/dao";
import * as createShopifyVariant from "../../shopify-variants/dao";
import { create } from "./service";
import { omit } from "lodash";

test("create can create shopify products and variants", async (t: Test) => {
  const createProductStub = sandbox()
    .stub(createShopifyProduct, "create")
    .resolves({ id: "56789" });
  const createVariantStub = sandbox()
    .stub(createShopifyVariant, "create")
    .resolves();

  await create({
    design: {
      12345: "56789",
    },
    variants: {
      123456789012: "123456",
    },
  });

  t.deepEqual(
    omit(createProductStub.firstCall.args[0], "id"),
    {
      designId: "12345",
      shopifyId: "56789",
      deletedAt: null,
      createdAt: createProductStub.firstCall.args[0].createdAt,
    },
    "it creates the shopify product correctly"
  );
  t.deepEqual(
    omit(createVariantStub.firstCall.args[0], "id"),
    {
      variantId: "123456789012",
      shopifyId: "123456",
      createdAt: createVariantStub.firstCall.args[0].createdAt,
      deletedAt: null,
      shopifyProductId: "56789",
    },
    "it creates the shopify variant correctly"
  );
});

test("create doesn't create if a resource fails", async (t: Test) => {
  const createProductStub = sandbox()
    .stub(createShopifyProduct, "create")
    .rejects();
  const createVariantStub = sandbox()
    .stub(createShopifyVariant, "create")
    .resolves();

  try {
    await create({
      design: {
        12345: "56789",
      },
      variants: {
        123456789012: "123456",
      },
    });
    t.fail("did not throw!");
  } catch (e) {
    t.deepEqual(
      omit(createProductStub.firstCall.args[0], "id"),
      {
        designId: "12345",
        shopifyId: "56789",
        deletedAt: null,
        createdAt: createProductStub.firstCall.args[0].createdAt,
      },
      "it creates the shopify product correctly"
    );
    t.deepEqual(
      createVariantStub.notCalled,
      true,
      "it does not reach the variants due to the failure"
    );
  }
});
