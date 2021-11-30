import { sandbox, test, Test, db } from "../test-helpers/fresh";
import generateComponent from "../test-helpers/factories/component";
import { generateProductDesignOption } from "../test-helpers/factories/product-design-options";

import { ComponentType } from "../components/components/types";
import * as AssetLinksService from "../services/attach-asset-links";

import * as EnrichmentService from "./enrich-component";

test("enrichComponent returns enriched component with asset links", async (t: Test) => {
  const assetLink = {
    assetId: "an asset id",
    key: "an asset key",
    assetLink: null,
    asset3xLink: null,
  };
  const getLinkStub = sandbox()
    .stub(AssetLinksService, "getLink")
    .resolves(assetLink);

  const { component } = await generateComponent();

  const enrichedComponent = await EnrichmentService.enrichComponent(
    db,
    component
  );
  t.equal(getLinkStub.callCount, 1);
  t.deepEqual(enrichedComponent, {
    ...component,
    ...assetLink,
    option: null,
  });
});

test("enrichComponent adds option to a material component", async (t: Test) => {
  const assetLink = {
    assetId: "an asset id",
    key: "an asset key",
    assetLink: null,
    asset3xLink: null,
  };
  const getLinkStub = sandbox()
    .stub(AssetLinksService, "getLink")
    .resolves(assetLink);

  const materialOption = await generateProductDesignOption();
  const { component } = await generateComponent({
    type: ComponentType.Material,
    materialId: materialOption.id,
  });

  const enrichedComponent = await EnrichmentService.enrichComponent(
    db,
    component
  );

  t.equal(getLinkStub.callCount, 1);
  t.deepEqual(enrichedComponent, {
    ...component,
    ...assetLink,
    option: materialOption,
  });
});

test("enrichComponentsList returns enriched components", async (t: Test) => {
  const assetLink = {
    assetId: "an asset id",
    key: "an asset key",
    assetLink: null,
    asset3xLink: null,
  };
  const getLinkStub = sandbox()
    .stub(AssetLinksService, "getLink")
    .resolves(assetLink);

  const materialOption = await generateProductDesignOption();
  const { component: materialComponent } = await generateComponent({
    type: ComponentType.Material,
    materialId: materialOption.id,
  });

  const { component: artworkComponent } = await generateComponent({
    type: ComponentType.Artwork,
  });

  const enrichedComponents = await EnrichmentService.enrichComponentsList(db, [
    materialComponent,
    artworkComponent,
  ]);

  t.equal(getLinkStub.callCount, 2);
  t.deepEqual(enrichedComponents, [
    {
      ...materialComponent,
      ...assetLink,
      option: materialOption,
    },
    { ...artworkComponent, ...assetLink, option: null },
  ]);
});
