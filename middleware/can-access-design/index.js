'use strict';

const getDesignPermissions = require('../../services/get-design-permissions');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignsDAO = require('../../dao/product-designs');

function* canAccessDesignId(designId) {
  const design = yield ProductDesignsDAO.findById(designId)
    .catch(InvalidDataError, err => this.throw(404, err));

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

module.exports = {
  canAccessDesignId,
  canAccessDesignInParam,
  canAccessDesignInQuery
};
