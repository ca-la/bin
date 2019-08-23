'use strict';

const {
  create,
  findAll,
  findByFitPartner,
  findByFitPartnerCustomer,
  findByUserId,
  SCAN_TYPES,
  updateOneById
} = require('./index');
const { test } = require('../../test-helpers/fresh');
const createFitPartner = require('../../test-helpers/factories/fit-partner');
const createUser = require('../../test-helpers/create-user');
const FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
const InvalidDataError = require('../../errors/invalid-data');

test('ScansDAO.create creates a new scan', t => {
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
    .then(scan => {
      t.equal(scan.id.length, 36);
      t.equal(scan.measurements.heightCm, 200);
      t.equal(scan.measurements.weightKg, 60);
    });
});

test('ScansDAO.create fails without a type', t => {
  return createUser({ withSession: false })
    .then(({ user }) => {
      return create({
        userId: user.id
      });
    })
    .then(() => {
      throw new Error("Shouldn't get here");
    })
    .catch(err => {
      t.equal(err instanceof InvalidDataError, true);
      t.equal(err.message, 'Scan type must be provided');
    });
});

test('ScansDAO.updateOneById updates a scan', t => {
  return createUser({ withSession: false })
    .then(({ user }) => {
      return create({
        userId: user.id,
        type: SCAN_TYPES.photo
      });
    })
    .then(scan => {
      return updateOneById(scan.id, {
        measurements: { heightCm: 200 }
      });
    })
    .then(updated => {
      t.equal(updated.measurements.heightCm, 200);
    });
});

test('ScansDAO.updateOneById allows marking as started', async t => {
  const { user } = await createUser({ withSession: false });
  const scan = await create({
    userId: user.id,
    type: SCAN_TYPES.photo
  });

  const updated = await updateOneById(scan.id, {
    isStarted: true
  });
  t.equal(updated.isStarted, true);
});

test('ScansDAO.findByUserId does not find deleted scans', t => {
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
    .then(scans => {
      t.equal(scans.length, 1);
      t.equal(scans[0].deletedAt, null);
    });
});

test('ScansDAO.findByFitPartner returns only scans owned by a partner', async t => {
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

test('ScansDAO.findByFitPartnerCustomer returns scans for a customer', async t => {
  const { user } = await createUser({ withSession: false });
  const partner = await createFitPartner({ adminUserId: user.id });

  const customer1 = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    shopifyUserId: '1234'
  });

  const customer2 = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    shopifyUserId: '4321'
  });

  const scan1 = await create({
    fitPartnerCustomerId: customer1.id,
    type: SCAN_TYPES.photo
  });

  await create({
    fitPartnerCustomerId: customer2.id,
    type: SCAN_TYPES.photo
  });

  const scans = await findByFitPartnerCustomer(customer1.id);

  t.equal(scans.length, 1);
  t.equal(scans[0].id, scan1.id);
});

test('ScansDAO.findAll returns all scans with fit customer meta', async t => {
  const { user } = await createUser({ withSession: false });
  const partner = await createFitPartner({ adminUserId: user.id });

  const customer1 = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    shopifyUserId: '1234'
  });

  const customer2 = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    phone: '+18002349087'
  });

  const scan1 = await create({
    fitPartnerCustomerId: customer1.id,
    type: SCAN_TYPES.photo
  });
  const scan2 = await create({
    fitPartnerCustomerId: customer2.id,
    type: SCAN_TYPES.photo
  });

  const scans = await findAll({ limit: 10, offset: 0 });

  t.equal(scans.length, 2);
  const foundScan1 = scans.find(scan => scan.id === scan1.id);
  const foundScan2 = scans.find(scan => scan.id === scan2.id);
  t.isNot(foundScan1, null);
  t.isNot(foundScan2, null);
  t.equal(foundScan1.shopifyUserId, customer1.shopifyUserId);
  t.equal(foundScan2.shopifyUserId, customer2.shopifyUserId);
});
