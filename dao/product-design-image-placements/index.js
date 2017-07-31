'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const ProductDesignImagePlacement = require('../../domain-objects/product-design-image-placement');

const instantiate = data => new ProductDesignImagePlacement(data);

function deleteForDesign(dbConnection, designId) {
}

function createForDesign(dbConnection, designId, placements) {
}

function replaceForDesign(designId, placements) {
  return db.transaction((trx) => {
    deleteForDesign(trx, designId)
      .then(() => {
        return createForDesign(trx, designId, placements);
      })
      .then(trx.commit)
      .catch(trx.rollback);
  });
}
