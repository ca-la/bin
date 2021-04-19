import { Component, ComponentType } from "./types";
import * as AssetsDAO from "../../components/assets/dao";
import OptionsDAO from "../../dao/product-design-options";
import Asset from "../../components/assets/types";

export default async function getAsset(
  component: Component
): Promise<Asset | null> {
  switch (component.type) {
    case ComponentType.Artwork: {
      if (!component.artworkId) {
        throw new Error(`Component ${component.id} has no artwork_id.`);
      }

      return await AssetsDAO.findById(component.artworkId);
    }

    case ComponentType.Sketch: {
      if (!component.sketchId) {
        throw new Error(`Component ${component.id} has no sketch_id.`);
      }

      return await AssetsDAO.findById(component.sketchId);
    }

    case ComponentType.Material: {
      const option = await OptionsDAO.findById(component.materialId);
      return await AssetsDAO.findById(option.previewImageId);
    }
  }
}
