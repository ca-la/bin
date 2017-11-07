'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const ProductDesignsDAO = require('../../dao/product-designs');
const User = require('../../domain-objects/user');
const { ROLES } = require('../../domain-objects/product-design-collaborator');

function* canAccessDesignId(designId) {
  const design = yield ProductDesignsDAO.findById(designId)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.assert(design, 404, 'Design not found');

  const isAdmin = (this.state.role === User.ROLES.admin);
  const isOwnerOrAdmin = isAdmin || (this.state.userId === design.userId);

  const designPermissions = {
    canManagePricing: isAdmin
  };

  if (!isOwnerOrAdmin) {
    this.assert(this.state.userId, 401);

    const collaborators = yield ProductDesignCollaboratorsDAO.findByDesignAndUser(
      designId,
      this.state.userId
    );

    this.assert(collaborators.length >= 1, 403);

    const { role } = collaborators[0];

    if (role === ROLES.productionPartner) {
      designPermissions.canManagePricing = true;
    }
  }

  this.state.design = design;
  this.state.designPermissions = designPermissions;
}

function* canAccessDesignInParam(next) {
  yield canAccessDesignId.call(this, this.params.designId);

  yield next;
}

function* canAccessDesignInQuery(next) {
  yield canAccessDesignId.call(this, this.query.designId);

  yield next;
}

module.exports = {
  canAccessDesignId,
  canAccessDesignInParam,
  canAccessDesignInQuery
};
