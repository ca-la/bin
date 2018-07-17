'use strict';

const filterError = require('../../services/filter-error');
const getDesignPermissions = require('../../services/get-design-permissions');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignsDAO = require('../../dao/product-designs');

function* canAccessDesignId(designId) {
  const design = yield ProductDesignsDAO.findById(designId)
    .catch(filterError(InvalidDataError, err => this.throw(404, err)));

  this.assert(design, 404, 'Design not found');

  this.state.design = design;
  this.state.designPermissions = yield getDesignPermissions(
    design,
    this.state.userId,
    this.state.role
  );
}

function* canAccessDesignInParam(next) {
  yield canAccessDesignId.call(this, this.params.designId);

  yield next;
}

function* canAccessDesignInQuery(next) {
  this.assert(this.query.designId, 400, 'Must provide design ID');
  yield canAccessDesignId.call(this, this.query.designId);

  yield next;
}

function* canCommentOnDesign(next) {
  if (!this.state.designPermissions) {
    throw new Error('canCommentOnDesign must be chained from canAccessDesign');
  }

  this.assert(
    this.state.designPermissions.canComment,
    403,
    "You don't have permission to comment on this design"
  );

  yield next;
}

function* canEditDesign(next) {
  if (!this.state.designPermissions) {
    throw new Error('canEditDesign must be chained from canAccessDesign');
  }

  this.assert(
    this.state.designPermissions.canEdit,
    403,
    "You don't have permission to edit this design"
  );

  yield next;
}

module.exports = {
  canAccessDesignId,
  canAccessDesignInParam,
  canAccessDesignInQuery,
  canCommentOnDesign,
  canEditDesign
};
