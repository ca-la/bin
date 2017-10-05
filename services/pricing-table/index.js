'use strict';

const ProductDesignSelectedOptionsDAO = require('../../dao/product-design-selected-options');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignOptionsDAO = require('../../dao/product-design-options');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');

class LineItem {
  constructor(data) {
    this.id = data.id;
    this.quantity = data.quantity;
    this.unitPriceCents = data.unitPriceCents;
    this.totalPriceCents = data.quantity * data.unitPriceCents;
  }
}

class Group {
  constructor(data) {
    this.lineItems = data.lineItems;
  }
}

class Summary {
  constructor(data) {
    this.upfrontCostcents = data.upfrontCostCents;
    this.preprodutionCostCents = data.preproductionCostCents;
    this.uponCompletionCostCents = data.uponCompletionCostCents;
    this.totalProfitCents = data.totalProfitCents;
  }
}

async function makeComputedPricingTable(design) {
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

function getFinalPricingTable(design) {
  const computed  
}

module.exports = {
  calculatePricingTable,
  calculatePricingTableWithOverrides
};
