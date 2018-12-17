'use strict';

const uuid = require('node-uuid');

const InvoicesDAO = require('../../dao/invoices');
const CollaboratorsDAO = require('../../dao/collaborators');
const ProductDesignServicesDAO = require('../../dao/product-design-services');

const { group, sandbox } = require('../../test-helpers/fresh');

const getDesignPermissionsDeprecated = require('.');

let test = group(() => {
  sandbox().stub(InvoicesDAO, 'findUnpaidByDesignAndStatus')
    .returns(Promise.resolve([]));
});

test('getDesignPermissionsDeprecated when owner and when all status invoices are paid', async (t) => {
  const userId = 'userId';
  const design = {
    status: 'NEEDS_DEVELOPMENT_PAYMENT',
    userId
  };

  t.deepEqual(
    await getDesignPermissionsDeprecated(design, userId, 'USER'),
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

test('getDesignPermissionsDeprecated when owner and when all status invoices are not paid', async (t) => {
  const userId = 'userId';
  const design = {
    status: 'NEEDS_DEVELOPMENT_PAYMENT',
    userId
  };

  t.deepEqual(
    await getDesignPermissionsDeprecated(design, userId, 'USER'),
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

test('getDesignPermissionsDeprecated when partner', async (t) => {
  const userId = 'userId';
  const partnerId = 'partnerId';
  const design = {
    id: uuid.v4(),
    status: 'NEEDS_DEVELOPMENT_PAYMENT',
    userId
  };

  sandbox().stub(CollaboratorsDAO, 'findByDesignAndUser')
    .resolves(null);
  sandbox().stub(ProductDesignServicesDAO, 'findByDesignAndUser')
    .resolves([{
      id: uuid.v4(),
      designId: design.id,
      vendorUserId: partnerId
    }]);
  t.deepEqual(
    await getDesignPermissionsDeprecated(design, partnerId, 'PARTNER'),
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
