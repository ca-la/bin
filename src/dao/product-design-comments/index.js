'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first').default;
const ProductDesignComment = require('../../domain-objects/product-design-comment');

const instantiate = row => new ProductDesignComment(row);
const maybeInstantiate = data =>
  (data && new ProductDesignComment(data)) || null;

const { dataMapper } = ProductDesignComment;

const TABLE_NAME = 'product_design_comments';

async function findByDesign(designId) {
  const result = await db
    .raw(
      `
select c.*
  from product_design_comments as c
    left join product_design_sections as s
      on s.id = c.section_id
  where s.design_id = ?
  and c.deleted_at is null
  and s.deleted_at is null
  order by c.created_at asc;
    `,
      [designId]
    )
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
    .update(
      {
        deleted_at: new Date().toISOString()
      },
      '*'
    )
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
