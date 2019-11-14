import Knex from 'knex';
import process from 'process';
import uuid from 'node-uuid';
import { chunk } from 'lodash';

import db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';
import { CanvasRow } from '../../components/canvases/domain-object';
import { NodeRow } from '../../components/nodes/domain-objects';
import { DesignRootNodeRow } from '../../components/nodes/domain-objects/design-root';
import { ComponentRow } from '../../components/components/domain-object';
import { AssetRow } from '../../components/assets/domain-object';
import { LayoutAttributeRow } from '../../components/attributes/layout-attributes/domain-object';
import portComponent from './port-component';
import { ImageAttributeRow } from '../../components/attributes/image-attributes/domain-objects';

export type EnrichedComponent = ComponentRow & {
  canvas_id: string;
  artwork_asset: AssetRow | null;
  material_asset: AssetRow | null;
  sketch_asset: AssetRow | null;
};

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
TRUNCATE TABLE layout_attributes CASCADE;
TRUNCATE TABLE material_attributes CASCADE;
TRUNCATE TABLE image_attributes CASCADE;
TRUNCATE TABLE design_root_nodes CASCADE;
TRUNCATE TABLE nodes CASCADE;
    `);

    const canvases: CanvasRow[] = await trx('canvases')
      .select('*')
      .where({ deleted_at: null });
    log(`Porting ${canvases.length} canvases to DesignRootNodes.`);
    await portCanvases(canvases, trx);

    const components: EnrichedComponent[] = await trx('components')
      .select(
        'components.*',
        'canvases.id AS canvas_id',
        db.raw('row_to_json(artwork_assets.*) as artwork_asset'),
        db.raw('row_to_json(material_assets.*) as material_asset'),
        db.raw('row_to_json(sketch_assets.*) as sketch_asset')
      )
      .from('components')
      .joinRaw(`LEFT JOIN canvases ON canvases.component_id = components.id`)
      .joinRaw(
        `LEFT JOIN assets AS artwork_assets ON artwork_assets.id = components.artwork_id`
      )
      .joinRaw(
        `LEFT JOIN assets AS sketch_assets ON sketch_assets.id = components.sketch_id`
      )
      .joinRaw(
        `LEFT JOIN product_design_options AS options ON options.id = components.material_id`
      )
      .joinRaw(
        `LEFT JOIN assets AS material_assets ON material_assets.id = options.preview_image_id`
      )
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

/**
 * Ports Canvases over as root nodes for a design. These root nodes are also "Frames."
 */
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
      title: canvas.title,
      type: 'FRAME'
    });
    rootNodeInsertions.push({
      id: uuid.v4(),
      node_id: canvas.id,
      design_id: canvas.design_id
    });
  }

  log(`Preparing ${nodeInsertions.length} Nodes for insertion`);
  for (const c of chunk(nodeInsertions, 1000)) {
    log(`Creating ${c.length} Nodes`);
    await trx('nodes').insert(c);
  }
  log(`Preparing ${rootNodeInsertions.length} DesignRootNodes for insertion`);
  for (const c of chunk(rootNodeInsertions, 1000)) {
    log(`Creating ${c.length} DesignRootNodes`);
    await trx('design_root_nodes').insert(c);
  }
}

async function portComponents(
  components: EnrichedComponent[],
  trx: Knex.Transaction
): Promise<void> {
  const nodeInsertions: NodeRow[] = [];
  const imageInsertions: ImageAttributeRow[] = [];
  const layoutInsertions: LayoutAttributeRow[] = [];

  for (const component of components) {
    const bundle = portComponent(component);
    if (bundle) {
      nodeInsertions.push(bundle.node);
      imageInsertions.push(bundle.imageAttribute);
      layoutInsertions.push(
        bundle.layoutAttributeForRoot,
        bundle.layoutAttribute
      );
    }
  }

  log(`Preparing ${nodeInsertions.length} Nodes for insertion`);
  for (const c of chunk(nodeInsertions, 1000)) {
    log(`Creating ${c.length} Nodes`);
    await trx('nodes').insert(c);
  }

  log(`Preparing ${imageInsertions.length} ImageAttributes for insertion`);
  for (const c of chunk(imageInsertions, 1000)) {
    log(`Creating ${c.length} ImageAttributes`);
    await trx('image_attributes').insert(c);
  }

  log(`Preparing ${layoutInsertions.length} LayoutAttributes for insertion`);
  for (const c of chunk(layoutInsertions, 1000)) {
    log(`Creating ${c.length} LayoutAttributes`);
    await trx('layout_attributes').insert(c);
  }
}
