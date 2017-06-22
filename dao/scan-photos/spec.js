'use strict';

const {
  create,
  updateOneById,
  findByScanId
} = require('./index');

const ScansDAO = require('../scans');
const { test } = require('../../test-helpers/fresh');
const createUser = require('../../test-helpers/create-user');

test('ScanPhotosDAO.findByScanId orders by creation time', (t) => {
  let scanId;
  let firstId;
  let secondId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      return ScansDAO.create({
        userId: user.id,
        type: ScansDAO.SCAN_TYPES.photo
      });
    })
    .then((scan) => {
      scanId = scan.id;
      return create({ scanId });
    })
    .then((scanPhoto) => {
      firstId = scanPhoto.id;
      return create({ scanId });
    })
    .then((scanPhoto) => {
      secondId = scanPhoto.id;
      return findByScanId(scanId);
    })
    .then((photos) => {
      t.equal(photos[0].id, firstId);
      t.equal(photos[1].id, secondId);
    });
});

test('ScanPhotosDAO.updateOneById updates a photo', (t) => {
  return createUser({ withSession: false })
    .then(({ user }) => {
      return ScansDAO.create({
        userId: user.id,
        type: ScansDAO.SCAN_TYPES.photo
      });
    })
    .then((scan) => {
      return create({
        scanId: scan.id
      });
    })
    .then((scanPhoto) => {
      return updateOneById(scanPhoto.id, {
        controlPoints: {
          ok: { x: 1, y: 2 }
        },
        calibrationData: {
          tilt: 100
        }
      });
    })
    .then((updated) => {
      t.deepEqual(updated.controlPoints, { ok: { x: 1, y: 2 } });
      t.deepEqual(updated.calibrationData, { tilt: 100 });
    });
});
