'use strict';

const canCompleteStatus = require('../../services/can-complete-status');
const ForbiddenError = require('../../errors/forbidden');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const UnauthorizedError = require('../../errors/unauthorized');
const User = require('../../domain-objects/user');
const { ROLES } = require('../../domain-objects/product-design-collaborator');

async function getDesignPermissions(design, userId, sessionRole) {
  const isAdmin = (sessionRole === User.ROLES.admin);
  const isOwnerOrAdmin = isAdmin || (userId === design.userId);
  let isProductionPartnerOrAdmin = isAdmin;

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

    const { role } = collaborators[0];

    if (role === ROLES.productionPartner) {
      isProductionPartnerOrAdmin = true;
    }
  }

  const designPermissions = {
    canManagePricing: isProductionPartnerOrAdmin,
    canAddPartners: isProductionPartnerOrAdmin,
    canCompleteStatus: canCompleteStatus(design.status, isProductionPartnerOrAdmin)
  };

  return designPermissions;
}

module.exports = getDesignPermissions;
