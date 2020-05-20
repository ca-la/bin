import { sandbox, test, Test } from "../../test-helpers/fresh";
import { createStorefront } from "./index";
import * as StorefrontsDAO from "../../components/storefronts/dao";
import * as StorefrontUsersDAO from "../../components/storefronts/users/dao";
import * as StorefrontTokensDAO from "../../components/storefronts/tokens/dao";
import { ProviderName } from "../../components/storefronts/tokens/domain-object";

test("createStorefront happy path", async (t: Test) => {
  const mockStorefront = {
    id: "some-id",
    name: "some-shoppe",
    createdAt: new Date(),
    deletedAt: null,
    createdBy: "a-user-id",
  };
  sandbox().stub(StorefrontsDAO, "create").resolves(mockStorefront);
  sandbox().stub(StorefrontUsersDAO, "create").resolves();
  sandbox().stub(StorefrontTokensDAO, "create").resolves();

  const storefront = await createStorefront({
    accessToken: "an-access-token",
    baseUrl: "https://some-shoppe.myshopify.com",
    name: "some-shoppe",
    providerName: ProviderName.SHOPIFY,
    userId: "a-user-id",
  });

  t.deepEqual(storefront, mockStorefront);
});

test("createStorefront when one DAO method rejects", async (t: Test) => {
  const storefrontCreateStub = sandbox()
    .stub(StorefrontsDAO, "create")
    .rejects(new Error("Someone set up us the bomb!"));
  const userCreateStub = sandbox()
    .stub(StorefrontUsersDAO, "create")
    .resolves();
  const tokenCreateStub = sandbox()
    .stub(StorefrontTokensDAO, "create")
    .resolves();

  try {
    await createStorefront({
      accessToken: "an-access-token",
      baseUrl: "https://some-shoppe.myshopify.com",
      name: "some-shoppe",
      providerName: ProviderName.SHOPIFY,
      userId: "a-user-id",
    });
  } catch (e) {
    t.deepEqual(e, new Error("Someone set up us the bomb!"));
    t.true(storefrontCreateStub.called);
    t.true(userCreateStub.notCalled);
    t.true(tokenCreateStub.notCalled);
  }
});
