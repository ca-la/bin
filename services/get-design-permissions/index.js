'use strict';

const canCompleteStatus = require('../../services/can-complete-status');
const ForbiddenError = require('../../errors/forbidden');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const ProductDesignServicesDAO = require('../../dao/product-design-services');
const UnauthorizedError = require('../../errors/unauthorized');
const User = require('../../domain-objects/user');

async function getDesignPermissions(design, userId, sessionRole) {
  const isAdmin = (sessionRole === User.ROLES.admin);
  const isPartner = (sessionRole === User.ROLES.partner);
  const isOwnerOrAdmin = isAdmin || (userId === design.userId);

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
    canManagePricing: isAdmin,
    canViewPricing: !isPartner,
    canCompleteStatus: canCompleteStatus(design.status, isPartner, isAdmin),
    canManuallySetStatus: isAdmin,
    canSetStatusEstimates: isPartner || isAdmin
  };

  return designPermissions;
}

module.exports = getDesignPermissions;
