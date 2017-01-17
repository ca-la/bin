'use strict';

const { create, updateOneById, SCAN_TYPES } = require('./index');
const { test } = require('../../test-helpers/fresh');
const createUser = require('../../test-helpers/create-user');
const InvalidDataError = require('../../errors/invalid-data');

test('ScansDAO.create creates a new scan', (t) => {
  return createUser(false)
    .then(({ user }) => {
      return create({
        userId: user.id,
        type: SCAN_TYPES.photo,
        measurements: {
          heightCm: 200,
          weightKg: 60
        }
      });
    })
    .then((scan) => {
      t.equal(scan.id.length, 36);
      t.equal(scan.measurements.heightCm, 200);
      t.equal(scan.measurements.weightKg, 60);
    });
});

test('ScansDAO.create fails without a type', (t) => {
  return createUser(false)
    .then(({ user }) => {
      return create({
        userId: user.id
      });
    })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.equal(err instanceof InvalidDataError, true);
      t.equal(err.message, 'Scan type must be provided');
    });
});

test('ScansDAO.updateOneById updates a scan', (t) => {
  return createUser(false)
    .then(({ user }) => {
      return create({
        userId: user.id,
        type: SCAN_TYPES.photo
      });
    })
    .then((scan) => {
      return updateOneById(scan.id, {
        measurements: { heightCm: 200 }
      });
    })
    .then((updated) => {
      t.equal(updated.measurements.heightCm, 200);
    });
});
