import uuid from "node-uuid";
import { create } from "../../components/components/dao";
import { Component, ComponentType } from "../../components/components/types";
import { findById as findUserById } from "../../components/users/dao";
import { findById as findAssetById } from "../../components/assets/dao";
import ProductDesignOptionsDAO from "../../components/product-design-options/dao";
import { ProductDesignOption } from "../../components/product-design-options/types";
import createUser from "../create-user";
import Asset from "../../components/assets/types";
import generateAsset from "./asset";
import db from "../../services/db";

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
          db,
          options.materialId
        ).then((option: ProductDesignOption | null) =>
          option?.previewImageId ? findAssetById(option.previewImageId) : null
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
        assetPageNumber: null,
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
        assetPageNumber: null,
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
        type: ComponentType.Material,
        assetPageNumber: null,
      });
      break;
    default:
      throw new Error("Invalid component type");
  }

  return { asset, component, createdBy: user };
}
