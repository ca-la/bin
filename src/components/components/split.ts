import Knex from "knex";

import * as ImgixService from "../../services/imgix";
import { Component, SPLITTABLE_MIME_TYPES } from "./types";
import getAsset from "./get-asset";
import Asset from "../../components/assets/types";
import { create as createComponent } from "./dao";

export class NonSplittableComponentError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "NonSplittableComponentError";
  }
}

export async function isSplittableAsset(asset: Asset): Promise<boolean> {
  return SPLITTABLE_MIME_TYPES.includes(asset.mimeType);
}

export async function splitComponent(
  trx: Knex.Transaction,
  originalComponent: Component
): Promise<Component[]> {
  const asset = await getAsset(originalComponent);

  if (!asset) {
    throw new Error(`Asset for component ${originalComponent.id} not found`);
  }

  if (!asset.uploadCompletedAt) {
    throw new Error("Asset has not finished uploading");
  }

  const isSplittable = await isSplittableAsset(asset);

  if (!isSplittable) {
    throw new NonSplittableComponentError("Cannot split this type of file");
  }

  const pageCount = await ImgixService.getPageCount(asset.id);

  const components = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const component = await createComponent(
      {
        assetPageNumber: page,
        parentId: null,
        type: originalComponent.type,
        materialId: originalComponent.materialId,
        artworkId: originalComponent.artworkId,
        sketchId: originalComponent.sketchId,
        createdBy: originalComponent.createdBy,
      },
      trx
    );

    components.push(component);
  }

  return components;
}
