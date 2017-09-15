'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignsDAO = require('../../dao/product-designs');
const User = require('../../domain-objects/user');

function* canAccessDesign(next) {
  const design = yield ProductDesignsDAO.findById(this.params.designId)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.assert(design, 404);

  const hasAccess = (
    this.state.userId === design.userId ||
    this.state.role === User.ROLES.admin
  );

  this.assert(hasAccess, 403);

  this.state.design = design;

  yield next;
}

module.exports = canAccessDesign;
