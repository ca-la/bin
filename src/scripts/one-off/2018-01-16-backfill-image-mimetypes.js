'use strict';

const COLORS = require('../../services/colors');
const db = require('../../services/db');
const Logger = require('../../services/logger');
const { getFile } = require('../../services/aws');
const { AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME } = require('../../config');
const { update } = require('../../components/images/dao');

const { green, yellow, red } = COLORS.fmt;

async function backfill() {
  const rows = await db
    .select('*')
    .from('product_design_images')
    .whereNull('mime_type');

  Logger.log(yellow(`Found ${rows.length} images without mimetypes`));

  for (let i = 0; i < rows.length; i += 1) {
    Logger.log(yellow(`Processing ${rows[i].id}`));

    let mimeType;
    try {
      const data = await getFile(
        AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
        rows[i].id
      );
      mimeType = data.ContentType;
    } catch (err) {
      Logger.log(red(err.message));
      // eslint-disable-next-line no-continue
      continue;
    }

    Logger.log(yellow(`Found mime type ${mimeType}`));

    const updated = await update(rows[i].id, {
      mimeType
    });

    Logger.log(yellow(`Updated ${updated.id}: ${updated.mimeType}`));
  }

  Logger.log(green('fin'));
  process.exit(0);
}

backfill();
