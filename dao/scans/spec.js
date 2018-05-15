'use strict';

const {
  create,
  findByFitPartner,
  findByUserId,
  SCAN_TYPES,
  updateOneById
} = require('./index');
const { test } = require('../../test-helpers/fresh');
const createFitPartner = require('../../test-helpers/factories/fit-partner');
const createUser = require('../../test-helpers/create-user');
const FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
const InvalidDataError = require('../../errors/invalid-data');

test('ScansDAO.create creates a new scan', (t) => {
  return createUser({ withSession: false })
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
  return createUser({ withSession: false })
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
  return createUser({ withSession: false })
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

test('ScansDAO.findByUserId does not find deleted scans', (t) => {
  let userId;
  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;

      return Promise.all([
        create({
          userId: user.id,
          type: SCAN_TYPES.photo
        }),
        create({
          deletedAt: new Date(),
          userId: user.id,
          type: SCAN_TYPES.photo
        })
      ]);
    })
    .then(() => {
      return findByUserId(userId);
    })
    .then((scans) => {
      t.equal(scans.length, 1);
      t.equal(scans[0].deletedAt, null);
    });
});

test('ScansDAO.findByFitPartner returns only scans owned by a partner', async (t) => {
  const calaCustomer = (await createUser({ withSession: false })).user;

  const owner1 = (await createUser({ withSession: false })).user;
  const owner2 = (await createUser({ withSession: false })).user;

  const owner1Partner = await createFitPartner({ adminUserId: owner1.id });
  const owner2Partner = await createFitPartner({ adminUserId: owner2.id });

  const owner1Customer = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: owner1Partner.id,
    shopifyUserId: '1234'
  });

  const owner2Customer = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: owner2Partner.id,
    shopifyUserId: '4321'
  });

  // A scan not owned by either fit partner
  await create({
    userId: calaCustomer.id,
    type: SCAN_TYPES.photo
  });

  // A scan owned by Owner 1
  await create({
    fitPartnerCustomerId: owner1Customer.id,
    type: SCAN_TYPES.photo
  });

  // A scan owned by Owner 2
  const owner2Scan = await create({
    fitPartnerCustomerId: owner2Customer.id,
    type: SCAN_TYPES.photo
  });

  const scans = await findByFitPartner(owner2.id, { limit: 10, offset: 0 });

  t.equal(scans.length, 1);
  t.equal(scans[0].id, owner2Scan.id);
});
