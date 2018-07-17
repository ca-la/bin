'use strict';

// NOTE: We've removed image-size in favor of probe-image-size as it had trouble
// with some image types. The API is slightly different, so we'll have to rework
// this script if we ever need to reuse any parts of it.

// eslint-disable-next-line
const sizeOf = require('image-size');
const fetch = require('node-fetch');

const ProductDesignImage = require('../domain-objects/product-design-image');
const { update } = require('../dao/product-design-images');
const db = require('../services/db');
const Logger = require('../services/logger');
const COLORS = require('../services/colors');

const { green, yellow, red } = COLORS.fmt;

async function backfill() {
  const rows = await db
    .select('*')
    .from('product_design_images')
    .whereNull('original_height_px');

  Logger.log(yellow(`Found ${rows.length} rows`));

  for (let i = 0; i < rows.length; i += 1) {
    Logger.log(yellow(`Processing ${rows[i].id}`));
    const image = new ProductDesignImage(rows[i]);

    let size;
    try {
      const res = await fetch(image.getUrl());
      const buffer = await res.buffer();
      size = sizeOf(buffer);
    } catch (err) {
      Logger.log(red(err.message));
      size = { width: 0, height: 0 };
    }

    Logger.log(yellow(`Found dimensions ${size.width} x ${size.height}. Updating...`));
    const updated = await update(image.id, {
      originalHeightPx: size.height,
      originalWidthPx: size.width
    });
    Logger.log(yellow(`Updated ${updated.id}: ${updated.originalWidthPx} x ${updated.originalHeightPx}`));
  }

  Logger.log(green('fin'));
  process.exit(0);
}

backfill();
