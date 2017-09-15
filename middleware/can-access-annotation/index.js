'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignSectionAnnotationsDAO = require('../../dao/product-design-section-annotations');

function* canAccessAnnotation(next) {
  if (!this.state.section) {
    throw new Error('Must confirm canAccessSection first');
  }

  const annotation = yield ProductDesignSectionAnnotationsDAO.findById(this.params.annotationId)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.assert(annotation, 404);
  this.assert(annotation.sectionId === this.state.section.id, 404);

  yield next;
}

module.exports = canAccessAnnotation;
