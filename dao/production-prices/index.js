'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const InvalidDataError = require('../../errors/invalid-data');
const ProductionPrice = require('../../domain-objects/production-price');
const { requireValues } = require('../../services/require-properties');

const { dataMapper } = ProductionPrice;

const instantiate = data => new ProductionPrice(data);

const TABLE_NAME = 'production_prices';

function deleteForVendorAndService(trx, vendorUserId, serviceId) {
  requireValues({ trx, vendorUserId, serviceId });

  return db(TABLE_NAME)
    .transacting(trx)
    .where({
      service_id: serviceId,
      vendor_user_id: vendorUserId
    })
    .del();
}

function createForVendorAndService(trx, vendorUserId, serviceId, prices) {
  requireValues({ trx, vendorUserId, serviceId, prices });

  const rowData = prices.map((data) => {
    return Object.assign({}, dataMapper.userDataToRowData(data), {
      id: uuid.v4(),
      service_id: serviceId,
      vendor_user_id: vendorUserId
    });
  });

  return db(TABLE_NAME)
    .transacting(trx)
    .insert(rowData)
    .returning('*')
    .then((inserted) => {
      return inserted
        .map(instantiate)
        .sort((a, b) => a.minimumUnits - b.minimumUnits);
    })
    .catch(rethrow)
    .catch(rethrow.ERRORS.NotNullViolation, (err) => {
      switch (err.column) {
        case 'minimum_units':
          throw new InvalidDataError('Minimum units must be provided');
        case 'complexity_level':
          throw new InvalidDataError('Complexity level must be provided');
        case 'price_cents':
          throw new InvalidDataError('Price must be provided');
        default:
          throw err;
      }
    })
    .catch(rethrow.ERRORS.ForeignKeyViolation, (err) => {
      if (err.constraint === 'production_prices_service_id_fkey') {
        throw new InvalidDataError('Invalid service ID');
      }
      throw err;
    });
}

function replaceForVendorAndService(vendorUserId, serviceId, prices) {
  requireValues({ vendorUserId, serviceId, prices });

  return db.transaction((trx) => {
    deleteForVendorAndService(trx, vendorUserId, serviceId)
      .then(() => {
        if (prices.length > 0) {
          return createForVendorAndService(trx, vendorUserId, serviceId, prices);
        }

        return [];
      })
      .then(trx.commit)
      .catch(trx.rollback);
  });
}

function findByVendor(vendorUserId) {
  return db(TABLE_NAME)
    .where({
      vendor_user_id: vendorUserId
    })
    .orderBy('minimum_units', 'asc')
    .catch(rethrow)
    .then(prices => prices.map(instantiate));
}

module.exports = {
  replaceForVendorAndService,
  findByVendor
};
