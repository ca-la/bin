'use strict';

const canCompleteStatus = require('../../services/can-complete-status');
const ForbiddenError = require('../../errors/forbidden');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const UnauthorizedError = require('../../errors/unauthorized');
const User = require('../../domain-objects/user');

async function getDesignPermissions(design, userId, sessionRole) {
  const isAdmin = (sessionRole === User.ROLES.admin);
  const isPartner = (sessionRole === User.ROLES.partner);
  const isOwnerOrAdmin = isAdmin || (userId === design.userId);
  const isPartnerOrAdmin = isAdmin || isPartner;

  if (!isOwnerOrAdmin) {
    if (!userId) {
      throw new UnauthorizedError('Sign in to access this design');
    }

    const collaborators = await ProductDesignCollaboratorsDAO.findByDesignAndUser(
      design.id,
      userId
    );

    if (collaborators.length < 1) {
      throw new ForbiddenError('You do not have access to this design');
    }
  }

  const designPermissions = {
    canManagePricing: isAdmin,
    canViewPricing: !isPartner,
    canCompleteStatus: canCompleteStatus(design.status, isPartnerOrAdmin)
  };

  return designPermissions;
}

module.exports = getDesignPermissions;
