'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const ProductDesignFeaturePlacement = require('../../domain-objects/product-design-feature-placement');

const { dataMapper } = ProductDesignFeaturePlacement;
const instantiate = data => new ProductDesignFeaturePlacement(data);

function deleteForSection(trx, sectionId) {
  return db('product_design_feature_placements')
    .transacting(trx)
    .where({ section_id: sectionId })
    .del();
}

function createForSection(trx, sectionId, placements) {
  const rows = placements.map((placementData) => {
    return Object.assign({}, dataMapper.userDataToRowData(placementData), {
      id: uuid.v4(),
      section_id: sectionId
    });
  });

  return db('product_design_feature_placements')
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
  return db('product_design_feature_placements')
    .where({
      section_id: sectionId
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(placements => placements.map(instantiate));
}

module.exports = {
  replaceForSection,
  findBySectionId
};
