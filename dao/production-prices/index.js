'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const ProductionPrice = require('../../domain-objects/production-price');

const { dataMapper } = ProductionPrice;

const instantiate = data => new ProductionPrice(data);

function deleteForVendorAndService(trx, vendorUserId, serviceId) {
  return db('product_design_services')
    .transacting(trx)
    .where({
      service_id: serviceId,
      vendor_user_id: vendorUserId
    })
    .del();
}

function createForVendorAndService(trx, vendorUserId, serviceId, prices) {
  const rowData = prices.map((data) => {
    return Object.assign({}, dataMapper.userDataToRowData(data), {
      id: uuid.v4(),
      service_id: serviceId,
      vendor_user_id: vendorUserId
    });
  });

  return db('production_prices')
    .transacting(trx)
    .insert(rowData)
    .returning('*')
    .then(inserted => inserted.map(instantiate))
    .catch(rethrow);
}

function replaceForVendorAndService(vendorUserId, serviceId, prices) {
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
  return db('production_prices')
    .where({
      vendor_user_id: vendorUserId
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(prices => prices.map(instantiate));
}

module.exports = {
  replaceForVendorAndService,
  findByVendor
};
