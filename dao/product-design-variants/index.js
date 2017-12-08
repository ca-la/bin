'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignVariant = require('../../domain-objects/product-design-variant');

const { dataMapper } = ProductDesignVariant;

const instantiate = data => new ProductDesignVariant(data);

function deleteForDesign(trx, designId) {
  return db('product_design_variants')
    .transacting(trx)
    .where({ design_id: designId })
    .del();
}

function createForDesign(trx, designId, variants) {
  const rowData = variants.map((data) => {
    if (!data.colorName && !data.sizeName) {
      throw new InvalidDataError('Color name or size name must be provided');
    }

    return Object.assign({}, dataMapper.userDataToRowData(data), {
      id: uuid.v4(),
      design_id: designId
    });
  });

  return db('product_design_variants')
    .transacting(trx)
    .insert(rowData)
    .returning('*')
    .then(inserted => inserted.map(instantiate))
    .catch(rethrow)
    .catch(rethrow.ERRORS.UniqueViolation, (err) => {
      if (err.constraint === 'product_design_variant_position') {
        throw new InvalidDataError('Cannot create two variants with the same position');
      }
      throw err;
    });
}

function replaceForDesign(designId, variants) {
  return db.transaction((trx) => {
    deleteForDesign(trx, designId)
      .then(() => {
        if (variants.length > 0) {
          return createForDesign(trx, designId, variants);
        }

        return [];
      })
      .then(trx.commit)
      .catch(trx.rollback);
  });
}

function findByDesignId(designId) {
  return db('product_design_variants')
    .where({
      design_id: designId
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(variants => variants.map(instantiate));
}

module.exports = {
  replaceForDesign,
  findByDesignId
};
