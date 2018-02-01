'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignService = require('../../domain-objects/product-design-service');

const { dataMapper } = ProductDesignService;

const TABLE_NAME = 'product_design_services';

const instantiate = data => new ProductDesignService(data);
const maybeInstantiate = data => (data && new ProductDesignService(data)) || null;

function deleteForDesign(trx, designId) {
  return db(TABLE_NAME)
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

  return db(TABLE_NAME)
    .transacting(trx)
    .insert(rowData)
    .returning('*')
    .then(inserted => inserted.map(instantiate))
    .catch(rethrow)
    .catch(rethrow.ERRORS.NotNullViolation, (err) => {
      if (err.column === 'service_id') {
        throw new InvalidDataError('Service ID must be provided');
      }
    })
    .catch(rethrow.ERRORS.ForeignKeyViolation, (err) => {
      if (err.constraint === 'product_design_services_service_id_fkey') {
        throw new InvalidDataError('Invalid service ID');
      }
      throw err;
    });
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
  return db(TABLE_NAME)
    .where({
      design_id: designId
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(services => services.map(instantiate));
}

function findByUserId(userId) {
  return db(TABLE_NAME)
    .where({
      vendor_user_id: userId
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(services => services.map(instantiate));
}

function findByDesignAndUser(designId, userId) {
  return db(TABLE_NAME)
    .where({
      vendor_user_id: userId,
      design_id: designId
    })
    .then(services => services.map(instantiate))
    .catch(rethrow);
}

function update(id, data) {
  const rowData = compact(dataMapper.userDataToRowData(data));

  return db(TABLE_NAME)
    .where({ id })
    .update(rowData, '*')
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

module.exports = {
  findByDesignAndUser,
  findByDesignId,
  findByUserId,
  replaceForDesign,
  update
};
