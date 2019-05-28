'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first').default;
const compact = require('../../services/compact');
const ScanPhoto = require('../../domain-objects/scan-photo');

const instantiate = data => new ScanPhoto(data);

function create(data) {
  return db('scanphotos')
    .insert(
      {
        id: uuid.v4(),
        scan_id: data.scanId
      },
      '*'
    )
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findByScanId(scanId) {
  return db('scanphotos')
    .where(
      {
        scan_id: scanId,
        deleted_at: null
      },
      '*'
    )
    .orderBy('created_at', 'asc')
    .catch(rethrow)
    .then(photos => photos.map(instantiate));
}

function findById(id) {
  return db('scanphotos')
    .where({ id }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function deleteByScanId(scanId) {
  return db('scanphotos')
    .where({
      scan_id: scanId,
      deleted_at: null
    })
    .update(
      {
        deleted_at: new Date()
      },
      '*'
    )
    .catch(rethrow)
    .then(photos => photos.map(instantiate));
}

function updateOneById(id, data) {
  return db('scanphotos')
    .where({
      id,
      deleted_at: null
    })
    .update(
      compact({
        calibration_data: data.calibrationData,
        control_points: data.controlPoints
      }),
      '*'
    )
    .then(first)
    .then(instantiate);
}

module.exports = {
  create,
  findByScanId,
  findById,
  deleteByScanId,
  updateOneById
};
