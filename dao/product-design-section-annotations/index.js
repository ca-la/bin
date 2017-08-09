'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const ProductDesignSectionAnnotation = require('../../domain-objects/product-design-section-annotation');

const instantiate = data => new ProductDesignSectionAnnotation(data);

function deleteForSection(trx, sectionId) {
  return db('product_design_section_annotations')
    .transacting(trx)
    .where({ section_id: sectionId })
    .del();
}

function createForSection(trx, sectionId, annotations) {
  const annotationData = annotations.map((annotation) => {
    return {
      id: uuid.v4(),
      section_id: sectionId,
      text: annotation.text,
      x: annotation.x,
      y: annotation.y
    };
  });

  return db('product_design_section_annotations')
    .transacting(trx)
    .insert(annotationData)
    .returning('*')
    .catch(rethrow)
    .then(inserted => inserted.map(instantiate));
}

function replaceForSection(sectionId, annotations) {
  return db.transaction((trx) => {
    deleteForSection(trx, sectionId)
      .then(() => {
        if (annotations.length > 0) {
          return createForSection(trx, sectionId, annotations);
        }

        return [];
      })
      .then(trx.commit)
      .catch(trx.rollback);
  });
}

function findBySectionId(sectionId) {
  return db('product_design_section_annotations')
    .where({
      section_id: sectionId
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(annotations => annotations.map(instantiate));
}

module.exports = {
  replaceForSection,
  findBySectionId
};
