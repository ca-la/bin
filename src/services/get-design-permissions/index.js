'use strict';

const ForbiddenError = require('../../errors/forbidden');
const InvoicesDAO = require('../../dao/invoices');
const CollaboratorsDAO = require('../../dao/collaborators');
const ProductDesignServicesDAO = require('../../dao/product-design-services');
const UnauthorizedError = require('../../errors/unauthorized');
const User = require('../../domain-objects/user');
const { PRODUCTION_STATUSES, PAYMENT_STATUSES } = require('../../config/design-statuses');
const { requireValues } = require('../require-properties');

// Whether a user can hit the 'complete' button in Studio.
// Whether they can make a PUT request to actually update the status is
// controlled by `canPutStatus`
function canInitiateStatusCompletion(
  currentStatus,
  isPartner,
  isAdmin
) {
  requireValues({ currentStatus, isPartner, isAdmin });

  const isDesigner = !isAdmin && !isPartner;

  if (currentStatus === 'COMPLETE') {
    return false;
  }

  if (PRODUCTION_STATUSES.indexOf(currentStatus) > -1) {
    return isPartner || isAdmin;
  }

  if (PAYMENT_STATUSES.indexOf(currentStatus) > -1) {
    return isDesigner || isAdmin;
  }

  return true;
}

async function canPutStatus(
  design,
  isOwner,
  isPartner,
  isAdmin
) {
  if (design.status === 'COMPLETE') {
    return isAdmin;
  }

  if (PRODUCTION_STATUSES.indexOf(design.status) > -1) {
    return isPartner || isAdmin;
  }

  if (PAYMENT_STATUSES.indexOf(design.status) > -1) {
    const unpaidInvoices = await InvoicesDAO.findUnpaidByDesignAndStatus(
      design.id,
      design.status
    );

    return (isOwner && unpaidInvoices.length === 0) || isAdmin;
  }

  return true;
}

function canModifyServices(
  currentStatus,
  isAdmin
) {
  const isUnsubmitted = (currentStatus === 'DRAFT');
  return isUnsubmitted || isAdmin;
}

async function getDesignPermissions(design, userId, sessionRole) {
  if (!userId) {
    throw new UnauthorizedError('Sign in to access this design');
  }

  const isOwner = (userId === design.userId);
  const isAdmin = (sessionRole === User.ROLES.admin);
  const isPartner = (sessionRole === User.ROLES.partner);
  const isOwnerOrAdmin = isAdmin || isOwner;
  const isPartnerOrAdmin = isPartner || isAdmin;

  let collaboratorRole;

  // TODO - this nested set of checks is pretty sloppy. Need to figure out a way
  // to short-circuit as soon as we know you have access and keep this
  // flat/extensible. Ideally somehow use `findUserDesigns` to keep the criteria
  // in sync re: who can access what.

  if (!isOwnerOrAdmin) {
    const collaborators = await CollaboratorsDAO.findByDesignAndUser(
      design.id,
      userId
    );

    if (collaborators.length < 1) {
      const services = await ProductDesignServicesDAO.findByDesignAndUser(
        design.id,
        userId
      );

      if (design.status === 'DRAFT' || services.length < 1) {
        throw new ForbiddenError('You do not have access to this design');
      }
    }

    collaboratorRole = collaborators[0] && collaborators[0].role;
  }

  const designPermissions = {
    canView: true,
    canEdit: !collaboratorRole || (collaboratorRole === 'EDIT'),
    canComment: !collaboratorRole || (collaboratorRole === 'EDIT') || (collaboratorRole === 'COMMENT'),
    canDelete: isOwnerOrAdmin,
    canManagePricing: isAdmin,
    canViewPricing: !isPartner,
    canInitiateStatusCompletion: canInitiateStatusCompletion(design.status, isPartner, isAdmin),
    canPutStatus: await canPutStatus(design, isOwner, isPartner, isAdmin),
    canSetStatusEstimates: isPartnerOrAdmin,
    canModifyServices: canModifyServices(design.status, isAdmin),
    canSetComplexityLevels: isPartnerOrAdmin
  };

  return designPermissions;
}

module.exports = getDesignPermissions;
