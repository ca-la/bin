'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const first = require('../../services/first');
const db = require('../../services/db');
const ProductDesignFeaturePlacement = require('../../domain-objects/product-design-feature-placement');

const { dataMapper } = ProductDesignFeaturePlacement;
const instantiate = data => new ProductDesignFeaturePlacement(data);

const TABLE_NAME = 'product_design_feature_placements';

function deleteForSection(trx, sectionId) {
  return db(TABLE_NAME)
    .transacting(trx)
    .where({ section_id: sectionId })
    .del();
}

function deleteById(id) {
  return db(TABLE_NAME)
    .where({ id })
    .del();
}

function createForSection(trx, sectionId, placements) {
  const rows = placements.map((placementData) => {
    return Object.assign({}, dataMapper.userDataToRowData(placementData), {
      id: uuid.v4(),
      section_id: sectionId
    });
  });

  return db(TABLE_NAME)
    .transacting(trx)
    .insert(rows)
    .returning('*')
    .catch(rethrow)
    .then(inserted => inserted.map(instantiate));
}

function replaceForSection(sectionId, placements) {
  return db.transaction((trx) => {
    deleteForSection(trx, sectionId)
      .then(() => {
        if (placements.length > 0) {
          return createForSection(trx, sectionId, placements);
        }

        return [];
      })
      .then(trx.commit)
      .catch(trx.rollback);
  });
}

function findBySectionId(sectionId) {
  return db(TABLE_NAME)
    .where({
      section_id: sectionId
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(placements => placements.map(instantiate));
}

function findById(id) {
  return db(TABLE_NAME)
    .where({ id })
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

module.exports = {
  deleteById,
  findById,
  findBySectionId,
  replaceForSection
};
