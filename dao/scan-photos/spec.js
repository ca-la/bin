'use strict';

const {
  create,
  updateOneById
} = require('./index');

const ScansDAO = require('../scans');
const { test } = require('../../test-helpers/fresh');
const createUser = require('../../test-helpers/create-user');

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
