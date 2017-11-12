'use strict';

const canCompleteStatus = require('../../services/can-complete-status');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const User = require('../../domain-objects/user');
const { ROLES } = require('../../domain-objects/product-design-collaborator');

async function getDesignPermissions(design, userId, sessionRole) {
  const isAdmin = (sessionRole === User.ROLES.admin);
  const isOwnerOrAdmin = isAdmin || (userId === design.userId);
  let isProductionPartnerOrAdmin = isAdmin;

  if (!isOwnerOrAdmin) {
    this.assert(userId, 401);

    const collaborators = await ProductDesignCollaboratorsDAO.findByDesignAndUser(
      design.id,
      userId
    );

    this.assert(collaborators.length >= 1, 403);

    const { role } = collaborators[0];

    if (role === ROLES.productionPartner) {
      isProductionPartnerOrAdmin = true;
    }
  }

  const designPermissions = {
    canManagePricing: isProductionPartnerOrAdmin,
    canCompleteStatus: canCompleteStatus(design.status, isProductionPartnerOrAdmin)
  };

  return designPermissions;
}

module.exports = getDesignPermissions;
