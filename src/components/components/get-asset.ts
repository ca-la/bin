import Knex from "knex";
import db from "../../services/db";
import { Component, ComponentType } from "./types";
import * as AssetsDAO from "../../components/assets/dao";
import ProductDesignOptionsDAO from "../../components/product-design-options/dao";
import Asset from "../../components/assets/types";

export default async function getAsset(
  component: Component,
  ktx: Knex = db
): Promise<Asset | null> {
  switch (component.type) {
    case ComponentType.Artwork: {
      if (!component.artworkId) {
        throw new Error(`Component ${component.id} has no artwork_id.`);
      }

      return await AssetsDAO.findById(component.artworkId, ktx);
    }

    case ComponentType.Sketch: {
      if (!component.sketchId) {
        throw new Error(`Component ${component.id} has no sketch_id.`);
      }

      return await AssetsDAO.findById(component.sketchId, ktx);
    }

    case ComponentType.Material: {
      const option = await ProductDesignOptionsDAO.findById(
        ktx,
        component.materialId
      );
      return option?.previewImageId
        ? await AssetsDAO.findById(option.previewImageId, ktx)
        : null;
    }
  }
}
