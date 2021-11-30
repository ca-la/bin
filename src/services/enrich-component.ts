import Knex from "knex";

import ProductDesignOptionsDAO from "../components/product-design-options/dao";
import { Component, ComponentType } from "../components/components/types";
import { EnrichedComponent } from "../components/canvases/types";
import { getLink } from "../services/attach-asset-links";

export async function enrichComponent(
  ktx: Knex,
  component: Component
): Promise<EnrichedComponent> {
  const assetLink = await getLink(component, ktx);

  let option = null;
  if (component.type === ComponentType.Material) {
    option = await ProductDesignOptionsDAO.findById(ktx, component.materialId);
    if (!option) {
      throw new Error(
        `Cannot find product design option ${component.materialId} for the material component ${component.id}`
      );
    }
  }

  return {
    ...component,
    ...assetLink,
    option,
  };
}

export async function enrichComponentsList(
  ktx: Knex,
  componentsList: Component[]
): Promise<EnrichedComponent[]> {
  const enrichedComponents = [];
  for (const component of componentsList) {
    const enrichedComponent = await enrichComponent(ktx, component);

    enrichedComponents.push(enrichedComponent);
  }

  return enrichedComponents;
}

export default enrichComponent;
