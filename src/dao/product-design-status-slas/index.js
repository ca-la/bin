'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first').default;
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignStatusSla = require('../../domain-objects/product-design-status-sla');

const { dataMapper } = ProductDesignStatusSla;

const instantiate = data => new ProductDesignStatusSla(data);
const maybeInstantiate = data =>
  (data && new ProductDesignStatusSla(data)) || null;

const TABLE_NAME = 'product_design_status_slas';

function deleteForDesign(trx, designId) {
  return db(TABLE_NAME)
    .transacting(trx)
    .where({ design_id: designId })
    .del();
}

function createForDesign(trx, designId, slas) {
  const rowData = slas.map(data => {
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
    .catch(err => {
      if (err instanceof rethrow.ERRORS.NotNullViolation) {
        const keyName = dataMapper.getKeyName(err.column) || 'All data';
        throw new InvalidDataError(`${keyName} must be provided`);
      }

      if (
        err instanceof rethrow.ERRORS.ForeignKeyViolation &&
        err.constraint === 'design_status_slas_status_id_fkey'
      ) {
        throw new InvalidDataError('Invalid service ID');
      }

      if (
        err instanceof rethrow.ERRORS.DatetimeFieldOverflow ||
        err instanceof rethrow.ERRORS.InvalidDatetimeFormat
      ) {
        throw new InvalidDataError('Invalid date format. Please use MM/DD/YY');
      }

      throw err;
    });
}

function replaceForDesign(designId, slas) {
  return db.transaction(trx => {
    deleteForDesign(trx, designId)
      .then(() => {
        if (slas.length > 0) {
          return createForDesign(trx, designId, slas);
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
    .then(slas => slas.map(instantiate))
    .catch(rethrow);
}

function findByDesignAndStatus(designId, statusId) {
  return db(TABLE_NAME)
    .where({
      design_id: designId,
      status_id: statusId
    })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

module.exports = {
  findByDesignAndStatus,
  findByDesignId,
  replaceForDesign
};
