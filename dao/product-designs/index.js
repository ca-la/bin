'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const ProductDesign = require('../../domain-objects/product-design');

const instantiate = data => new ProductDesign(data);

function create(data) {
  return db('productdesigns')
    .insert({
      id: uuid.v4()
    }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

module.exports = {
  create
};
