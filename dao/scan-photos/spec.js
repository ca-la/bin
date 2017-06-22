const {
  create,
  updateOneById,
} = require('./index');

const ScansDAO = require('../scans');
const { test } = require('../../test-helpers/fresh');
const createUser = require('../../test-helpers/create-user');

test('ScanPhotosDAO.updateOneById updates a photo', (t) => {
  return createUser({ withSession: false })
    .then(({ user }) => {
      return ScansDAO.create({
        userId: user.id,
        type: SCAN_TYPES.photo
      });
    })
    .then((scan) => {
      return create({
        scanId: scan.id
      })
        measurements: { heightCm: 200 }
      });
    })
    .then((updated) => {
      t.equal(updated.measurements.heightCm, 200);
    });
});
