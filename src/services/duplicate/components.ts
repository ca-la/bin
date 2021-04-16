import Knex from "knex";

import * as ComponentsDAO from "../../components/components/dao";
import { Component } from "../../components/components/types";
import prepareForDuplication from "./prepare-for-duplication";
import { findAndDuplicateOption } from "./options";

/**
 * Finds and duplicates the given component (and associated sub-resources).
 * Note: image ids are maintained since images are immutable.
 */
export async function findAndDuplicateComponent(
  componentId: string,
  newParentId: string | null,
  trx: Knex.Transaction
): Promise<Component> {
  const component = await ComponentsDAO.findById(componentId);
  const additionalFields: Partial<Component> = {};

  if (!component) {
    throw new Error(`Component ${componentId} does not exist!`);
  }

  if (component.materialId) {
    const materialOption = await findAndDuplicateOption(
      component.materialId,
      trx
    );
    additionalFields.materialId = materialOption.id;
  }

  return ComponentsDAO.create(
    prepareForDuplication<Component>(component, {
      ...additionalFields,
      parentId: newParentId,
    }),
    trx
  );
}
