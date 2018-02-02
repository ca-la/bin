'use strict';

const ForbiddenError = require('../../errors/forbidden');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
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

function canPutStatus(
  currentStatus,
  isPartner,
  isAdmin
) {
  if (currentStatus === 'COMPLETE') {
    return isAdmin;
  }

  if (PRODUCTION_STATUSES.indexOf(currentStatus) > -1) {
    return isPartner || isAdmin;
  }

  if (PAYMENT_STATUSES.indexOf(currentStatus) > -1) {
    return isAdmin;
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
  const isAdmin = (sessionRole === User.ROLES.admin);
  const isPartner = (sessionRole === User.ROLES.partner);
  const isOwnerOrAdmin = isAdmin || (userId === design.userId);
  const isPartnerOrAdmin = isPartner || isAdmin;

  let collaboratorRole;

  if (!isOwnerOrAdmin) {
    if (!userId) {
      throw new UnauthorizedError('Sign in to access this design');
    }

    const collaborators = await ProductDesignCollaboratorsDAO.findByDesignAndUser(
      design.id,
      userId
    );

    if (collaborators.length < 1) {
      const services = await ProductDesignServicesDAO.findByDesignAndUser(
        design.id,
        userId
      );

      if (services.length < 1) {
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
    canPutStatus: canPutStatus(design.status, isPartner, isAdmin),
    canSetStatusEstimates: isPartnerOrAdmin,
    canModifyServices: canModifyServices(design.status, isAdmin),
    canSetComplexityLevels: isPartnerOrAdmin
  };

  return designPermissions;
}

module.exports = getDesignPermissions;
