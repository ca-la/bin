'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const first = require('../../services/first').default;
const db = require('../../services/db');
const ProductDesignFeaturePlacement = require('../../domain-objects/product-design-feature-placement');

const { dataMapper } = ProductDesignFeaturePlacement;
const instantiate = data => new ProductDesignFeaturePlacement(data);

const TABLE_NAME = 'product_design_feature_placements';

function deleteForSectionTrx(trx, sectionId) {
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

function createForSectionTrx(trx, sectionId, placements) {
  const rows = placements.map((placementData) => {
    return Object.assign({}, dataMapper.userDataToRowData(placementData), {
      id: uuid.v4(),
      section_id: sectionId
    });
  });

  return db(TABLE_NAME)
    .returning('*')
    .transacting(trx)
    .insert(rows)
    .catch(rethrow)
    .then(inserted => inserted.map(instantiate));
}

function replaceForSection(sectionId, placements) {
  return db.transaction(async (trx) => {
    await deleteForSectionTrx(trx, sectionId);

    if (placements.length > 0) {
      return createForSectionTrx(trx, sectionId, placements);
    }

    return [];
  });
}

function findBySectionId(sectionId) {
  return db(TABLE_NAME)
    .where({
      section_id: sectionId
    })
    .orderBy('created_at', 'desc')
    .then(placements => placements.map(instantiate))
    .catch(rethrow);
}

function findById(id) {
  return db(TABLE_NAME)
    .where({ id })
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

module.exports = {
  deleteForSectionTrx,
  deleteById,
  findById,
  findBySectionId,
  replaceForSection
};
