'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const ProductDesignSectionAnnotation = require('../../domain-objects/product-design-section-annotation');

const instantiate = data => new ProductDesignSectionAnnotation(data);

function deleteById(annotationId) {
}

function createForSection(sectionId, data) {
}

function findById(annotationId) {
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
  deleteById,
  findById,
  createForSection,
  findBySectionId
};
