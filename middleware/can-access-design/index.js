'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const User = require('../../domain-objects/user');

function* canAccessDesign(next) {
  const design = yield ProductDesignsDAO.findById(this.params.designId)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.assert(design, 404);

  const isOwnerOrAdmin = (
    this.state.userId === design.userId ||
    this.state.role === User.ROLES.admin
  );

  if (!isOwnerOrAdmin) {
    this.assert(this.state.userId, 401);

    const collaborators = yield ProductDesignCollaboratorsDAO.findByUserId(this.state.userId);
    this.assert(collaborators.length >= 1, 403);
  }

  this.state.design = design;

  yield next;
}

module.exports = canAccessDesign;
