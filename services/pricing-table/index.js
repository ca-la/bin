'use strict';

const ProductDesignSelectedOptionsDAO = require('../../dao/product-design-selected-options');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignOptionsDAO = require('../../dao/product-design-options');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');

class Row {
  constructor({ quantity, unitPriceCents }) {
    this.quantity = quantity;
    this.unitPriceCents = unitPriceCents;
    this.totalPriceCents = quantity * unitPriceCents;
  }
}

class Group {
  constructor({ rows }) {
    this.rows = rows;
  }
}

async function calculatePricingTable(design) {
  const selectedOptions = await ProductDesignSelectedOptionsDAO.findByDesignId(design.id);
  const sections = await ProductDesignSectionsDAO.findByDesignId(design.id);
  const featurePlacements = await Promise.all(
    sections.map(section =>
      ProductDesignFeaturePlacementsDAO.findBySectionId(section.id)
    )
  );
  const options = await Promise.all(
    selectedOptions.map(selectedOption =>
      ProductDesignOptionsDAO.findById(selectedOption.optionId)
    )
  );
}

function calculatePricingTableWithOverrides(design, overrides) {
}

module.exports = {
  calculatePricingTable,
  calculatePricingTableWithOverrides
};
