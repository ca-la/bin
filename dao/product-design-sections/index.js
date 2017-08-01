'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const compact = require('../../services/compact');
const first = require('../../services/first');
const ProductDesignSection = require('../../domain-objects/product-design-section');

const instantiate = data => new ProductDesignSection(data);

function create(data) {
  return db('product_design_sections')
    .insert({
      template_name: data.templateName,
      design_id: data.designId,
      custom_image_id: data.customImageId,
      id: uuid.v4()
    }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function update(sectionId, data) {
  return db('product_design_sections')
    .where({ id: sectionId })
    .update(compact({
      template_name: data.templateName,
      design_id: data.designId,
      custom_image_id: data.customImageId
    }), '*')
    .then(first)
    .then(instantiate);
}

function findByDesignId(designId) {
  return db('product_design_sections')
    .where({
      design_id: designId,
      deleted_at: null
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(sections => sections.map(instantiate));
}

module.exports = {
  create,
  update,
  findByDesignId
};
