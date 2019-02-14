import * as Knex from 'knex';
import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import * as MeasurementsDAO from '../../dao/product-design-canvas-measurements';
import * as ComponentsDAO from '../../dao/components';
import OptionsDAO = require('../../dao/product-design-options');

import Measurement from '../../domain-objects/product-design-canvas-measurement';
import Component from '../../domain-objects/component';
import ProductDesignOption = require('../../domain-objects/product-design-option');

interface BaseResource {
  createdAt?: Date;
  id: string;
}

/**
 * Prepares any domain-object resource to be inserted as a duplicate.
 */
function prepareForDuplication<T extends BaseResource>(
  resource: T,
  additionalFields?: Partial<T>
): T {
  const newFields = Object.assign({}, { id: uuid.v4() }, additionalFields);
  return omit(Object.assign({}, resource, newFields), 'createdAt');
}

/**
 * Finds and duplicates the given product design option (and associated sub-resources).
 * Note: image ids are maintained since images are immutable.
 */
export async function findAndDuplicateOption(
  optionId: string,
  trx: Knex.Transaction
): Promise<ProductDesignOption> {
  const option = await OptionsDAO.findById(optionId);

  return OptionsDAO.create(
    prepareForDuplication(option),
    trx
  );
}

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
  const additionalFields: {
    artworkId?: string;
    materialId?: string;
    sketchId?: string;
  } = {};

  if (!component) { throw new Error(`Component ${componentId} does not exist!`); }

  if (component.materialId) {
    const materialOption = await findAndDuplicateOption(component.materialId, trx);
    additionalFields.materialId = materialOption.id;
  }

  return ComponentsDAO.create(
    prepareForDuplication(component, { ...additionalFields, parentId: newParentId }),
    trx
  );
}

/**
 * Finds all measurements for the given canvas and creates duplicates.
 */
export async function findAndDuplicateMeasurements(
  canvasId: string,
  trx: Knex.Transaction
): Promise<Measurement[]> {
  const measurements = await MeasurementsDAO.findAllByCanvasId(canvasId);
  return Promise.all(measurements.map((measurement: Measurement): Promise<Measurement> =>
    MeasurementsDAO.create(prepareForDuplication(measurement), trx)
  ));
}
