'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const ProductDesignService = require('../../domain-objects/product-design-service');

const { dataMapper } = ProductDesignService;

const instantiate = data => new ProductDesignService(data);

function deleteForDesign(trx, designId) {
  return db('product_design_services')
    .transacting(trx)
    .where({ design_id: designId })
    .del();
}

function createForDesign(trx, designId, services) {
  const rowData = services.map((data) => {
    return Object.assign({}, dataMapper.userDataToRowData(data), {
      id: uuid.v4(),
      design_id: designId
    });
  });

  return db('product_design_services')
    .transacting(trx)
    .insert(rowData)
    .returning('*')
    .catch(rethrow)
    .then(inserted => inserted.map(instantiate));
}

function replaceForDesign(designId, services) {
  return db.transaction((trx) => {
    deleteForDesign(trx, designId)
      .then(() => {
        if (services.length > 0) {
          return createForDesign(trx, designId, services);
        }

        return [];
      })
      .then(trx.commit)
      .catch(trx.rollback);
  });
}

function findByDesignId(designId) {
  return db('product_design_services')
    .where({
      design_id: designId
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(services => services.map(instantiate));
}

module.exports = {
  replaceForDesign,
  findByDesignId
};
