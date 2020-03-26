import { Transaction } from 'knex';
import process from 'process';

import { log, logServerError } from '../../services/logger';
import { blue, format, green, red, yellow } from '../../services/colors';
import db = require('../../services/db');
import OptionsDAO from '../../dao/product-design-options';
import * as AssetsDAO from '../../components/assets/dao';
import Asset from '../../components/assets/domain-object';
import Component, {
  ComponentType,
  dataAdapter as componentDataAdapter
} from '../../components/components/domain-object';

const PIN_WIDTH = 25.45;
const PIN_HEIGHT = 31.82;

// The top left of the pin graphic doesn't align to (0,0) due to offsets in the
// path as well as the drop shadow; subtracting this amount positions it correctly.
const PIN_ORIGIN_X = 15.2727;
const PIN_ORIGIN_Y = 15.2727;

// Make some assumptions about what size the SVG was in the user's browser when
// they placed the pin. This is definitely *just a guess*, but is based on a
// macbook pro 13" with CALA open full-screen.
const RENDERED_WIDTH = 1150;
const RENDERED_HEIGHT = 845;

// Mostly borrowed from the `getLink` function in `attach-asset-links` service
async function getAsset(component: Component): Promise<Asset | null> {
  switch (component.type) {
    case ComponentType.Artwork: {
      if (!component.artworkId) {
        throw new Error(`Component ${component.id} has no artwork_id.`);
      }

      const asset = await AssetsDAO.findById(component.artworkId);
      return asset;
    }

    case ComponentType.Sketch: {
      if (!component.sketchId) {
        throw new Error(`Component ${component.id} has no sketch_id.`);
      }

      const asset = await AssetsDAO.findById(component.sketchId);
      return asset;
    }

    case ComponentType.Material:
      {
        const option = await OptionsDAO.findById(component.materialId);
        const asset = await AssetsDAO.findById(option.previewImageId);
        return asset;
      }

      throw new Error(`Unknown component type: ${component.type}`);
  }
}

async function run(): Promise<void> {
  const isDryRun = process.argv[2] === '--dry-run';
  log(format(blue, `Dry run? ${isDryRun}`));

  await db.transaction(async (trx: Transaction) => {
    const annotations = await trx('product_design_canvas_annotations').select(
      '*'
    );
    log(format(blue, `Got ${annotations.length} annotations`));

    for (const annotation of annotations) {
      log(format(blue, `Working on annotation ${annotation.id}`));

      const componentRow = (await trx.raw(
        `
        select components.* from product_design_canvas_annotations as an
        join canvases on canvases.id = an.canvas_id
        join components on canvases.component_id = components.id
        where an.id = ?
      `,
        [annotation.id]
      )).rows[0];

      const component = componentDataAdapter.parse(componentRow);

      const asset = await getAsset(component);

      if (!asset) {
        throw new Error(`Cannot find asset for component ${component.id}`);
      }

      const { originalHeightPx, originalWidthPx } = asset;

      log(
        format(
          blue,
          `Found asset ${
            asset.id
          } with dimensions ${originalWidthPx}x${originalHeightPx}`
        )
      );

      if (originalHeightPx === 0 || originalWidthPx === 0) {
        log(format(yellow, `Width or height is zero, skipping this asset!`));
        continue;
      }

      // The scale at which the image was rendered is the smaller of the scales
      // of the two axes, so that the image would have fit onto the screen.
      // e.g. a 1000x1000 image being rendered into a 300x100 space is rendered
      // at 0.1 scale
      const relativeScale = Math.min(
        RENDERED_HEIGHT / originalHeightPx,
        RENDERED_WIDTH / originalWidthPx
      );

      const originalX = Number(annotation.x);
      const originalY = Number(annotation.y);

      const newX = originalX + (PIN_WIDTH / 2 + PIN_ORIGIN_X) / relativeScale;
      const newY = originalY + (PIN_HEIGHT + PIN_ORIGIN_Y) / relativeScale;

      log(
        format(
          blue,
          `Updating position from ${originalX},${originalY} to ${newX},${newY}`
        )
      );

      if (!isDryRun) {
        const result = await trx.raw(
          `
          update product_design_canvas_annotations
            set x = ?, y = ?
            where id = ?
            returning *
        `,
          [newX, newY, annotation.id]
        );

        if (result.rows.length !== 1) {
          log(format(red, result.rows));
          throw new Error(
            `Updated an unexpected number of rows (${result.rows.length}`
          );
        }

        log(format(green, `Updated ${result.rows.length} row(s)`));
      }
    }
  });
}

run()
  .then(() => {
    log(format(green, `Successfully adjusted!`));
    process.exit();
  })
  .catch(
    (err: any): void => {
      logServerError(err);
      process.exit(1);
    }
  );
