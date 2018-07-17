'use strict';

const ScansDAO = require('../../dao/scans');
const canAccessUserResource = require('../can-access-user-resource');

function* canAccessScanId(scanId) {
  if (!scanId) {
    throw new Error('Must pass scanId to canAccessScan');
  }

  const scan = yield ScansDAO.findById(scanId);
  this.assert(scan, 404, 'Scan not found');

  this.state.scan = scan;

  if (!scan.userId) {
    return;
  }

  canAccessUserResource.call(this, scan.userId);
}

function* canAccessScanInParam(next) {
  yield canAccessScanId.call(this, this.params.scanId);
  yield next;
}

module.exports = {
  canAccessScanId,
  canAccessScanInParam
};
