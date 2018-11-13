'use strict';

const InvoicesDAO = require('../../dao/invoices');
const CollaboratorsDAO = require('../../dao/collaborators');

const { group, sandbox } = require('../../test-helpers/fresh');

const getDesignPermissions = require('.');

let test = group(() => {
  sandbox().stub(InvoicesDAO, 'findUnpaidByDesignAndStatus')
    .returns(Promise.resolve([]));
});

test('getDesignPermissions when owner and when all status invoices are paid', async (t) => {
  const userId = 'userId';
  const design = {
    status: 'NEEDS_DEVELOPMENT_PAYMENT',
    userId
  };

  t.deepEqual(
    await getDesignPermissions(design, userId, 'USER'),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canInitiateStatusCompletion: true,
      canManagePricing: false,
      canModifyServices: false,
      canPutStatus: true,
      canSetStatusEstimates: false,
      canSetComplexityLevels: false,
      canView: true,
      canViewPricing: true
    }
  );
});

test = group(() => {
  sandbox().stub(InvoicesDAO, 'findUnpaidByDesignAndStatus')
    .returns(Promise.resolve([{}]));
});

test('getDesignPermissions when owner and when all status invoices are not paid', async (t) => {
  const userId = 'userId';
  const design = {
    status: 'NEEDS_DEVELOPMENT_PAYMENT',
    userId
  };

  t.deepEqual(
    await getDesignPermissions(design, userId, 'USER'),
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canInitiateStatusCompletion: true,
      canManagePricing: false,
      canModifyServices: false,
      canPutStatus: false,
      canSetStatusEstimates: false,
      canSetComplexityLevels: false,
      canView: true,
      canViewPricing: true
    }
  );
});

test('getDesignPermissions when partner', async (t) => {
  const userId = 'userId';
  const partnerId = 'partnerId';
  const design = {
    status: 'NEEDS_DEVELOPMENT_PAYMENT',
    userId
  };

  sandbox().stub(CollaboratorsDAO, 'findByDesignAndUser')
    .resolves([{ userId: partnerId, role: 'PREVIEW' }]);
  t.deepEqual(
    await getDesignPermissions(design, partnerId, 'PARTNER'),
    {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canInitiateStatusCompletion: false,
      canManagePricing: false,
      canModifyServices: false,
      canPutStatus: false,
      canSetStatusEstimates: true,
      canSetComplexityLevels: true,
      canView: true,
      canViewPricing: false
    }
  );
});
