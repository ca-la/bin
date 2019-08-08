import * as Knex from 'knex';
import * as process from 'process';
import * as uuid from 'node-uuid';
import { chunk } from 'lodash';

import * as db from '../services/db';
import { log } from '../services/logger';
import { green, red, reset } from '../services/colors';
import { CanvasRow } from '../components/canvases/domain-object';
import { NodeRow } from '../components/nodes/domain-objects';
import { DesignRootNodeRow } from '../components/nodes/domain-objects/design-root';
import { ComponentRow } from '../components/components/domain-object';
import { ArtworkAttributeRow } from '../components/attributes/artwork-attributes/domain-object';
import { MaterialAttributeRow } from '../components/attributes/material-attributes/domain-object';
import { SketchAttributeRow } from '../components/attributes/sketch-attributes/domain-object';
import { AssetRow } from '../components/assets/domain-object';
import first from '../services/first';

portToPhidias()
  .then(() => {
    log(`${green}Successfully moved all canvases and components to nodes.`);
    process.exit();
  })
  .catch(
    (error: any): void => {
      log(`${red}ERROR:\n${reset}`, error);
      process.exit(1);
    }
  );

/**
 * Ports canvases and components into nodes, root nodes, and various attributes.
 */

async function portToPhidias(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    log('Removing all existing nodes');
    await trx.raw(`
TRUNCATE TABLE artwork_attributes CASCADE;
TRUNCATE TABLE material_attributes CASCADE;
TRUNCATE TABLE sketch_attributes CASCADE;
TRUNCATE TABLE design_root_nodes CASCADE;
TRUNCATE TABLE nodes CASCADE;
     `);

    const canvases: CanvasRow[] = await trx('canvases')
      .select('*')
      .where({ deleted_at: null });
    log(`Porting ${canvases.length} canvases to DesignRootNodes.`);
    await portCanvases(canvases, trx);

    const components: (ComponentRow & { canvas_id: string })[] = await trx(
      'components'
    )
      .select('components.*', 'canvases.id AS canvas_id')
      .from('components')
      .joinRaw(`LEFT JOIN canvases ON canvases.component_id = components.id`)
      .where({ 'components.deleted_at': null })
      .whereIn(
        'components.id',
        canvases.reduce((acc: string[], canvas: CanvasRow): string[] => {
          return canvas.component_id ? [...acc, canvas.component_id] : acc;
        }, [])
      );
    log(`Porting ${components.length} components to Nodes.`);
    await portComponents(components, trx);
  });
}

async function portCanvases(
  canvases: CanvasRow[],
  trx: Knex.Transaction
): Promise<void> {
  const nodeInsertions: NodeRow[] = [];
  const rootNodeInsertions: DesignRootNodeRow[] = [];
  for (const canvas of canvases) {
    nodeInsertions.push({
      id: canvas.id,
      created_at: canvas.created_at,
      created_by: canvas.created_by,
      deleted_at: null,
      parent_id: null,
      x: String(canvas.x),
      y: String(canvas.y),
      ordering: canvas.ordering || 0,
      title: canvas.title
    });
    rootNodeInsertions.push({
      id: uuid.v4(),
      node_id: canvas.id,
      design_id: canvas.design_id
    });
  }

  log(`Preparing ${nodeInsertions.length} Nodes for insertion`);
  for (const c of chunk(nodeInsertions, 10000)) {
    log(`Creating ${c.length} Nodes`);
    await trx('nodes').insert(c);
  }
  log(`Preparing ${rootNodeInsertions.length} DesignRootNodes for insertion`);
  for (const c of chunk(rootNodeInsertions, 10000)) {
    log(`Creating ${c.length} DesignRootNodes`);
    await trx('design_root_nodes').insert(c);
  }
}

async function portComponents(
  components: (ComponentRow & { canvas_id: string })[],
  trx: Knex.Transaction
): Promise<void> {
  const nodeInsertions: NodeRow[] = [];
  const artworkInsertions: ArtworkAttributeRow[] = [];
  const materialInsertions: MaterialAttributeRow[] = [];
  const sketchInsertions: SketchAttributeRow[] = [];

  for (const component of components) {
    const node: NodeRow = {
      id: component.id,
      created_at: component.created_at,
      created_by: component.created_by,
      deleted_at: null,
      parent_id: component.canvas_id,
      x: '0',
      y: '0',
      ordering: 0,
      title: null
    };
    nodeInsertions.push(node);

    if (component.artwork_id) {
      const asset: AssetRow | undefined = await trx('assets')
        .select('*')
        .where({ id: component.artwork_id })
        .then((rows: AssetRow[]) => first(rows));

      if (!asset) {
        throw new Error(
          `Could not find asset for id "${component.artwork_id}"`
        );
      }

      artworkInsertions.push({
        node_id: component.id,
        asset_id: component.artwork_id,
        x: '0',
        y: '0',
        width: asset.original_width_px || '0',
        height: asset.original_height_px || '0'
      });
    }

    if (component.material_id) {
      const asset: AssetRow | undefined = await trx('assets')
        .select('assets.*')
        .from('assets')
        .joinRaw(
          `LEFT JOIN product_design_options ON product_design_options.preview_image_id = assets.id`
        )
        .where({ 'product_design_options.id': component.material_id })
        .then((rows: AssetRow[]) => first(rows));

      if (!asset) {
        throw new Error(
          `Could not find asset for product_desing_option ${
            component.material_id
          }`
        );
      }

      materialInsertions.push({
        node_id: component.id,
        asset_id: asset.id,
        width: asset.original_width_px || '0',
        height: asset.original_height_px || '0'
      });
    }

    if (component.sketch_id) {
      const asset: AssetRow | undefined = await trx('assets')
        .select('*')
        .where({ id: component.sketch_id })
        .then((rows: AssetRow[]) => first(rows));

      if (!asset) {
        throw new Error(`Could not find asset for id "${component.sketch_id}"`);
      }

      sketchInsertions.push({
        node_id: component.id,
        asset_id: component.sketch_id,
        x: '0',
        y: '0',
        width: asset.original_width_px || '0',
        height: asset.original_height_px || '0'
      });
    }
  }

  log(`Preparing ${nodeInsertions.length} Nodes for insertion`);
  for (const c of chunk(nodeInsertions, 10000)) {
    log(`Creating ${c.length} Nodes`);
    await trx('nodes').insert(c);
  }

  log(`Preparing ${artworkInsertions.length} ArtworkAttributes for insertion`);
  for (const c of chunk(artworkInsertions, 10000)) {
    log(`Creating ${c.length} ArtworkAttributes`);
    await trx('artwork_attributes').insert(c);
  }

  log(
    `Preparing ${materialInsertions.length} MaterialAttributes for insertion`
  );
  for (const c of chunk(materialInsertions, 10000)) {
    log(`Creating ${c.length} MaterialAttributes`);
    await trx('material_attributes').insert(c);
  }

  log(`Preparing ${sketchInsertions.length} SketchsAttributes for insertion`);
  for (const c of chunk(sketchInsertions, 10000)) {
    log(`Creating ${c.length} SketchAttributes`);
    await trx('sketch_attributes').insert(c);
  }
}
