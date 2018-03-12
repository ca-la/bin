'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first');
const ProductDesignComment = require('../../domain-objects/product-design');

const instantiate = row => new ProductDesignComment(row);
const maybeInstantiate = data => (data && new ProductDesignComment(data)) || null;

const { dataMapper } = ProductDesignComment;

const TABLE_NAME = 'product_design_comments';

async function findByDesign(designId) {
  const result = await db(TABLE_NAME)
    .raw(`
select product_design_section_comments.*
  from product_design_section_comments
    left join product_design_sections
      on product_design_sections.id = product_design_section_comments.section_id
    where product_design_sections.design_id = ?;
    `, [designId])
    .catch(rethrow);

  const { rows } = result;
  return rows.map(instantiate);
}

async function create(data) {
  const rowData = Object.assign(
    {},
    compact(dataMapper.userDataToRowData(data)),
    { id: uuid.v4() }
  );

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

async function update(id, data) {
  const rowData = compact(dataMapper.userDataToRowData(data));

  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

async function findById(id) {
  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

async function deleteById(id) {
  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({
      deleted_at: (new Date()).toISOString()
    }, '*')
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

module.exports = {
  create,
  deleteById,
  findByDesign,
  findById,
  update
};
