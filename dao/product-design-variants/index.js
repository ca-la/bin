'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
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
    .catch(rethrow);
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
