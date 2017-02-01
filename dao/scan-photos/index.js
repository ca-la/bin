'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const ScanPhoto = require('../../domain-objects/scan-photo');

const instantiate = data => new ScanPhoto(data);

function create(data) {
  return db('scanphotos').insert({
    id: uuid.v4(),
    scan_id: data.scanId
  }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findByScanId(scanId) {
  return db('scanphotos').where({
    scan_id: scanId
  }, '*')
    .catch(rethrow)
    .then(photos => photos.map(instantiate));
}

module.exports = {
  create,
  findByScanId
};
