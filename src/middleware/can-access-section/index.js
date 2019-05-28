'use strict';

const filterError = require('../../services/filter-error');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');

function* canAccessSection(next) {
  if (!this.state.design) {
    throw new Error('Must confirm canAccessDesign first');
  }

  const section = yield ProductDesignSectionsDAO.findById(
    this.params.sectionId
  ).catch(filterError(InvalidDataError, err => this.throw(404, err)));
  this.assert(section, 404);
  this.assert(section.designId === this.state.design.id, 404);

  this.state.section = section;

  yield next;
}

module.exports = canAccessSection;
