import uuid from "node-uuid";
import { create } from "../../components/components/dao";
import Component, {
  ComponentType,
} from "../../components/components/domain-object";
import { findById as findUserById } from "../../components/users/dao";
import { findById as findAssetById } from "../../components/assets/dao";
import * as ProductDesignOptionsDAO from "../../dao/product-design-options";
import createUser = require("../create-user");
import Asset from "../../components/assets/types";
import generateAsset from "./asset";
import ProductDesignOption from "../../domain-objects/product-design-option";

interface ComponentWithResources {
  component: Component;
  asset: Asset;
  createdBy: any;
}

export default async function generateComponent(
  options: Partial<Component>
): Promise<ComponentWithResources> {
  const user = options.createdBy
    ? await findUserById(options.createdBy)
    : await createUser({ withSession: false }).then(
        (response: any): any => response.user
      );

  const assetId = options.sketchId || options.artworkId || null;
  const { asset } = assetId
    ? { asset: await findAssetById(assetId) }
    : options.materialId
    ? {
        asset: await ProductDesignOptionsDAO.findById(
          options.materialId
        ).then(({ previewImageId }: ProductDesignOption) =>
          previewImageId ? findAssetById(previewImageId) : null
        ),
      }
    : await generateAsset();
  if (!asset) {
    throw new Error("Asset could not be found");
  }

  const componentType = options.type || ComponentType.Sketch;
  let component;

  switch (componentType) {
    case ComponentType.Sketch:
      component = await create({
        artworkId: null,
        createdBy: user.id,
        id: options.id || uuid.v4(),
        materialId: null,
        parentId: options.parentId || null,
        sketchId: asset.id,
        type: ComponentType.Sketch,
      });
      break;

    case ComponentType.Artwork:
      component = await create({
        artworkId: asset.id,
        createdBy: user.id,
        id: options.id || uuid.v4(),
        materialId: null,
        parentId: options.parentId || null,
        sketchId: null,
        type: ComponentType.Sketch,
      });
      break;

    case ComponentType.Material:
      component = await create({
        artworkId: null,
        createdBy: user.id,
        id: options.id || uuid.v4(),
        materialId: options.materialId!,
        parentId: options.parentId || null,
        sketchId: null,
        type: ComponentType.Sketch,
      });
      break;
    default:
      throw new Error("Invalid component type");
  }

  return { asset, component, createdBy: user };
}
