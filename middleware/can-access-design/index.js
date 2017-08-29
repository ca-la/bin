'use strict';

const ProductDesignsDAO = require('../../dao/product-designs');
const InvalidDataError = require('../../errors/invalid-data');

function* canAccessDesign(next) {
  const design = yield ProductDesignsDAO.findById(this.params.designId)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.assert(design, 404);

  this.assert(this.state.userId === design.userId, 403);

  this.state.design = design;

  yield next;
}

module.exports = canAccessDesign;
