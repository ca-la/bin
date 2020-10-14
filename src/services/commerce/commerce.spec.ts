import { test, Test, sandbox } from "../../test-helpers/fresh";
import { generateDesign } from "../../test-helpers/factories/product-design";
import * as VariantsDAO from "../../components/product-design-variants/dao";
import uuid from "node-uuid";
import createUser from "../../test-helpers/create-user";
import { fillSkus } from "./commerce";
import * as CommerceAPI from "./api";

test("fillSkus", async (t: Test) => {
  const sku = "sku-1";
  const upc = "935947577486";
  const { user } = await createUser({ withSession: false });
  const d1 = await generateDesign({
    title: "Get To Work Bandana",
    userId: user.id,
  });
  const v1 = await VariantsDAO.create({
    id: uuid.v4(),
    designId: d1.id,
    colorName: null,
    sizeName: null,
    unitsToProduce: 1,
    position: 1,
    colorNamePosition: 1,
    universalProductCode: upc,
    sku: null,
    isSample: false,
  });

  const fakeResponse = {
    status: 200,
    json: async () => {
      return [{ upc, sku }];
    },
  };
  sandbox().stub(CommerceAPI, "fetchCommerce").resolves(fakeResponse);
  await fillSkus("sf1");

  const v2 = await VariantsDAO.findById(v1.id);
  if (!v2) {
    throw new Error(`Variant should be still here`);
  }
  t.equal(v2.sku, sku, "sku updated");
});