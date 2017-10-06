'use strict';

const ProductDesignSelectedOptionsDAO = require('../../dao/product-design-selected-options');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignOptionsDAO = require('../../dao/product-design-options');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');

class LineItem {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
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
    this.unitsToProduce = data.unitsToProduce;
  }
}

class Table {
  constructor(data) {
    this.summary = data.summary;
    this.groups = data.groups;
  }
}

function mergePricingTables(computed, override) {
}

// The total cost of all "options" (fabrics + trims) required to make one
// garment
function getTotalPerUnitOptionCostCents(data) {
  requireProperties(data, 'selectedOptions', 'options');
  const { selectedOptions, options } = data;

}

// The total cost of all pattern-making in the garment. The sum of the
// patternmaking cost of each section.
function getTotalPatternMakingCostCents(data) {
  requireProperties(data, 'sections');
  const { sections } = data;
}

function getSelectedOptionDyeCostCents(data) {
  requireProperties(data, 'selectedOption');
  const { selectedOption } = data;
}

// Get the cost to do a feature placement (image print / embroidery) on each
// garment. Either a fixed cost (stuff like screenprinting) or a per-yard cost
// multiplied by the number of yards required (stuff like roll prints).
function getFeaturePlacementPerUnitCostCents(data) {
  requireProperties(data, 'featurePlacement');
  const { featurePlacement } = data;
}

function getFeaturePlacementSetupCostCents({ featurePlacement }) {
  requireProperties(data, 'featurePlacement');
  const { featurePlacement } = data;
}

async function getComputedPricingTable(design) {
  const selectedOptions = await ProductDesignSelectedOptionsDAO.findByDesignId(design.id);
  const sections = await ProductDesignSectionsDAO.findByDesignId(design.id);
  const featurePlacements = await flatten(Promise.all(
    sections.map(section =>
      ProductDesignFeaturePlacementsDAO.findBySectionId(section.id)
    )
  ));

  const patternMakingCostCents = getTotalPatternMakingCostCents({ sections });

  const summary = new Summary({
    retailPriceCents: design.retailPriceCents,
    unitsToProduce: design.unitsToProduce,
    total
  });

  const options = await Promise.all(
    selectedOptions.map(selectedOption =>
      ProductDesignOptionsDAO.findById(selectedOption.optionId)
    )
  );

  const perUnitOptionCostCents = getPerUnitOptionCostCents({ options, selectedOptions });

  const developmentGroup = new Group({
    title: 'Development',

    lineItems: [
      new LineItem({
        title: 'Pattern Making',
        id: 'development-patternmaking',
        quantity: 1,
        unitPriceCents: 0
      }),
      new LineItem({
        title: 'Sourcing/Testing',
        id: 'development-sourcing',
        quantity: 1,
        unitPriceCents: 0
      }),
      new LineItem({
        title: 'Sample Yardage & Trims',
        id: 'development-sample-yardage-trims',
        quantity: 1,
        unitPriceCents:
      }),
    ]
  });

  const materialsGroup = new Group({
    title: 'Materials & processes per garment',

    lineItems: [
    ]
  });

  const productionGroup = new Group({
    title: 'Production per garment',

    lineItems: [
      new LineItem({
        title: 'Cut, Sew, Trim',
        id: 'production-cut-sew-trim',
        quantity: unitsToProduce,
        unitPriceCents:
      }),
      new LineItem({
        title: 'Materials',
        id: 'production-materials',
        quantity: unitsToProduce,
        unitPriceCents:
      }),
      // SETUP FEES HERE
    ]
  });

  const fulfillmentGroup = new Group({
    title: 'Fulfillment per garment',

    lineItems: [
      new LineItem({
        title: 'Packaging - labor',
        id: 'fulfillment-packing',
        quantity: unitsToProduce,
        unitPriceCents: PACKAGING_PER_GARMENT_CENTS
      }),
      new LineItem({
        title: 'Shipping label',
        id: 'fulfillment-shipping',
        quantity: unitsToProduce,
        unitPriceCents: PACKAGING_PER_GARMENT_CENTS
      }),
    ]
  });

  return 
}

async function getFinalPricingTable(design) {
  const computed = await getComputedPricingTable(design);
  const override = design.overridePricingTable;

  const merged = mergePricingTables(computed, override);

  return merged;
}

module.exports = {
  getComputedPricingTable,
  getFinalPricingTable
};
