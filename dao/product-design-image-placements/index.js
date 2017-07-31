'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const ProductDesignImagePlacement = require('../../domain-objects/product-design-image-placement');

const instantiate = data => new ProductDesignImagePlacement(data);

function createForDesign(designId, placements) {
}

function deleteForDesign(designId) {
}

function replaceForDesign(designId, placements) {
  return deleteForDesign(design)
}
