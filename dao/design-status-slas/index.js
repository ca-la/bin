'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const InvalidDataError = require('../../errors/invalid-data');
const DesignStatusSla = require('../../domain-objects/design-status-sla');

const { dataMapper } = DesignStatusSla;

const instantiate = data => new DesignStatusSla(data);

const TABLE_NAME = 'design_status_slas';

function deleteForDesign(trx, designId) {
  return db(TABLE_NAME)
    .transacting(trx)
    .where({ design_id: designId })
    .del();
}

function createForDesign(trx, designId, slas) {
  const rowData = slas.map((data) => {
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
      const keyName = dataMapper.getKeyName(err.column) || 'All data';
      throw new InvalidDataError(`${keyName} must be provided`);
    })
    .catch(rethrow.ERRORS.ForeignKeyViolation, (err) => {
      if (err.constraint === 'design_status_slas_status_id_fkey') {
        throw new InvalidDataError('Invalid service ID');
      }
      throw err;
    });
}

function replaceForDesign(designId, slas) {
  return db.transaction((trx) => {
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
    .catch(rethrow)
    .then(slas => slas.map(instantiate));
}

module.exports = {
  findByDesignId,
  replaceForDesign
};
