import Knex from 'knex';
import uuid from 'node-uuid';
import db from '../services/db';
import { log } from '../services/logger';
import { PricingConstantRow } from '../domain-objects/pricing-constant';
import { PricingCareLabelRow } from '../domain-objects/pricing-care-label';
import { PricingProductMaterialRow } from '../domain-objects/pricing-product-material';
import { PricingProcessRow } from '../domain-objects/pricing-process';
import { PricingProductTypeRow } from '../components/pricing-product-types/domain-object';

function findLatest<T>(tableName: string): Promise<T[]> {
  return db(tableName)
    .select()
    .whereIn('version', db(tableName).max('version'));
}

async function updateConstants(
  trx: Knex.Transaction,
  constants: PricingConstantRow[],
  factor: number
): Promise<PricingConstantRow[]> {
  const toInsert: PricingConstantRow[] = constants.map(
    (constant: PricingConstantRow) => ({
      id: uuid.v4(),
      working_session_cents: Math.ceil(constant.working_session_cents * factor),
      technical_design_cents: Math.ceil(
        constant.technical_design_cents * factor
      ),
      pattern_revision_cents: Math.ceil(
        constant.pattern_revision_cents * factor
      ),
      grading_cents: Math.ceil(constant.grading_cents * factor),
      marking_cents: Math.ceil(constant.marking_cents * factor),
      sample_minimum_cents: Math.ceil(constant.sample_minimum_cents * factor),
      branded_labels_minimum_cents: Math.ceil(
        constant.branded_labels_minimum_cents * factor
      ),
      branded_labels_minimum_units: constant.branded_labels_minimum_units,
      branded_labels_additional_cents: Math.ceil(
        constant.branded_labels_additional_cents * factor
      ),
      created_at: new Date(),
      version: constant.version + 1
    })
  );

  return trx('pricing_constants')
    .insert(toInsert)
    .returning('*');
}

async function updateCareLabels(
  trx: Knex.Transaction,
  careLabels: PricingCareLabelRow[],
  factor: number
): Promise<PricingCareLabelRow[]> {
  const toInsert: PricingCareLabelRow[] = careLabels.map(
    (careLabel: PricingCareLabelRow) => ({
      id: uuid.v4(),
      version: careLabel.version + 1,
      minimum_units: careLabel.minimum_units,
      unit_cents: Math.ceil(careLabel.unit_cents * factor),
      created_at: new Date()
    })
  );

  return trx('pricing_care_labels')
    .insert(toInsert)
    .returning('*');
}

async function updateProductMaterials(
  trx: Knex.Transaction,
  materials: PricingProductMaterialRow[],
  factor: number
): Promise<PricingProductMaterialRow[]> {
  const toInsert: PricingProductMaterialRow[] = materials.map(
    (material: PricingProductMaterialRow) => ({
      id: uuid.v4(),
      version: material.version + 1,
      minimum_units: material.minimum_units,
      unit_cents: Math.ceil(material.unit_cents * factor),
      category: material.category,
      created_at: new Date()
    })
  );

  return trx('pricing_product_materials')
    .insert(toInsert)
    .returning('*');
}

async function updateProductTypes(
  trx: Knex.Transaction,
  types: PricingProductTypeRow[],
  factor: number
): Promise<PricingProductTypeRow[]> {
  const toInsert: PricingProductTypeRow[] = types.map(
    (type: PricingProductTypeRow) => ({
      id: uuid.v4(),
      version: type.version + 1,
      minimum_units: type.minimum_units,
      unit_cents: Math.ceil(type.unit_cents * factor),
      name: type.name,
      pattern_minimum_cents: Math.ceil(type.pattern_minimum_cents * factor),
      complexity: type.complexity,
      yield: type.yield,
      contrast: type.contrast,
      created_at: new Date().toISOString(),
      creation_time_ms: type.creation_time_ms,
      specification_time_ms: type.specification_time_ms,
      sourcing_time_ms: type.sourcing_time_ms,
      sampling_time_ms: type.sampling_time_ms,
      pre_production_time_ms: type.pre_production_time_ms,
      production_time_ms: type.production_time_ms,
      fulfillment_time_ms: type.fulfillment_time_ms
    })
  );

  return trx('pricing_product_types')
    .insert(toInsert)
    .returning('*');
}

async function updateProcesses(
  trx: Knex.Transaction,
  processes: PricingProcessRow[],
  factor: number
): Promise<PricingProcessRow[]> {
  const toInsert: PricingProcessRow[] = processes.map(
    (process: PricingProcessRow) => ({
      id: uuid.v4(),
      version: process.version + 1,
      minimum_units: process.minimum_units,
      unit_cents: Math.ceil(process.unit_cents * factor),
      complexity: process.complexity,
      setup_cents: Math.ceil(process.setup_cents * factor),
      name: process.name,
      created_at: new Date()
    })
  );

  return trx('pricing_processes')
    .insert(toInsert)
    .returning('*');
}

async function main(): Promise<void> {
  const factor = Number(process.argv[2]);

  if (Number.isNaN(factor)) {
    throw new TypeError('Usage: multiply-pricing.ts factor');
  }

  const constants = await findLatest<PricingConstantRow>('pricing_constants');
  const careLabels = await findLatest<PricingCareLabelRow>(
    'pricing_care_labels'
  );
  const materials = await findLatest<PricingProductMaterialRow>(
    'pricing_product_materials'
  );
  const types = await findLatest<PricingProductTypeRow>(
    'pricing_product_types'
  );
  const processes = await findLatest<PricingProcessRow>('pricing_processes');

  return db.transaction(async (trx: Knex.Transaction) => {
    log('Inserting to pricing_constants');
    const updatedConstants = await updateConstants(trx, constants, factor);
    log(JSON.stringify(updatedConstants, null, 2));
    log(` - ${updatedConstants.length} row(s) inserted`);

    log('Inserting to pricing_care_labels');
    const updatedCareLabels = await updateCareLabels(trx, careLabels, factor);
    log(` - ${updatedCareLabels.length} row(s) inserted`);

    log('Inserting to pricing_product_materials');
    const updatedMaterials = await updateProductMaterials(
      trx,
      materials,
      factor
    );
    log(` - ${updatedMaterials.length} row(s) inserted`);

    log('Inserting to pricing_product_types');
    const updatedTypes = await updateProductTypes(trx, types, factor);
    log(` - ${updatedTypes.length} row(s) inserted`);

    log('Inserting to pricing_processes');
    const updatedProcesses = await updateProcesses(trx, processes, factor);
    log(` - ${updatedProcesses.length} row(s) inserted`);
  });
}

main()
  .then(() => {
    process.exit();
  })
  .catch((err: Error) => {
    log(err.message);
    process.exit(1);
  });
