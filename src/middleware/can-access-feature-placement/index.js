'use strict';

const filterError = require('../../services/filter-error');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const { attachDesignPermissions } = require('../can-access-design');

function* canAccessFeaturePlacement(next) {
  if (!this.params.featureId) {
    throw new Error(
      'canAccessFeaturePlacment requires `featureId` in route params'
    );
  }

  const feature = yield ProductDesignFeaturePlacementsDAO.findById(
    this.params.featureId
  ).catch(filterError(InvalidDataError, err => this.throw(404, err)));

  this.assert(feature, 404);

  const section = yield ProductDesignSectionsDAO.findById(feature.sectionId);
  yield attachDesignPermissions.call(this, section.designId);

  yield next;
}

module.exports = canAccessFeaturePlacement;
