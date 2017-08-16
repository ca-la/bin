'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const ProductDesignFeaturePlacement = require('../../domain-objects/product-design-feature-placement');

const instantiate = data => new ProductDesignFeaturePlacement(data);

function deleteForSection(trx, sectionId) {
  return db('product_design_feature_placements')
    .transacting(trx)
    .where({ section_id: sectionId })
    .del();
}

function createForSection(trx, sectionId, placements) {
  const placementData = placements.map((placement) => {
    return {
      id: uuid.v4(),
      section_id: sectionId,
      image_id: placement.imageId,
      z_index: placement.zIndex,
      x: placement.x,
      y: placement.y,
      rotation: placement.rotation,
      width: placement.width,
      height: placement.height,
      type: placement.type,
      path_data: placement.pathData
    };
  });

  return db('product_design_feature_placements')
    .transacting(trx)
    .insert(placementData)
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
