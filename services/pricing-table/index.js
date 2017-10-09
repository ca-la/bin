'use strict';

const ProductDesignSelectedOptionsDAO = require('../../dao/product-design-selected-options');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignOptionsDAO = require('../../dao/product-design-options');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');

const pricing = require('../../config/pricing');

class LineItem {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.quantity = data.quantity;
    this.unitPriceCents = data.unitPriceCents;

    this.totalCostCents = this.getTotalCostCents();
  }

  getTotalCostCents() {
    return data.quantity * data.unitPriceCents;
  }
}

class ProfitLineItem {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.quantity = data.quantity;
    this.totalCents = data.totalCents;
    this.percentOfRevenue = data.percentOfRevenue;
  }
}

class Group {
  constructor(data) {
    this.lineItems = data.lineItems;
  }

  getTotalCostCents() {
    return this.lineItems.reduce((memo, item) =>
      memo + item.getTotalCostCents()
    , 0);
  }
}

class Summary {
  constructor(data) {
    this.upfrontCostCents = data.upfrontCostCents;
    this.preproductionCostCents = data.preproductionCostCents;
    this.uponCompletionCostCents = data.uponCompletionCostCents;
    this.totalProfitCents = data.totalProfitCents;
    this.unitsToProduce = data.unitsToProduce;
  }
}

class Table {
  constructor(data) {
    requireProperties(data, 'summary', 'groups');
    this.summary = data.summary;
    this.groups = data.groups;
  }
}

function mergePricingTables(computed, override) {
  return 
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

  if () {
  }
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
  const { unitsToProduce, retailPriceCents } = design;

  const selectedOptions = await ProductDesignSelectedOptionsDAO.findByDesignId(design.id);
  const sections = await ProductDesignSectionsDAO.findByDesignId(design.id);

  const featurePlacements = await flatten(Promise.all(
    sections.map(section =>
      ProductDesignFeaturePlacementsDAO.findBySectionId(section.id)
    )
  ));

  const patternMakingCostCents = getTotalPatternMakingCostCents({ sections });

  const summary = new Summary({
    retailPriceCents,
    unitsToProduce,
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
        unitPriceCents: pricing.SAMPLE_YARDAGE_AND_TRIMS_COST_CENTS
      }),
      new LineItem({
        title: 'First Sample Cut & Sew',
        id: 'development-sample-cut-sew-1',
        quantity: 1,
        unitPriceCents: getSampleCutSewCostCents(patternComplexity)
      }),
    ]
  });

  const materialsGroup = new Group({
    title: 'Materials & processes per garment',

    lineItems: [
    ]
  });

  const productionSetupCosts = 
  const productionGroup = new Group({
    title: 'Production per garment',

    lineItems: [
      new LineItem({
        title: 'Cut, Sew, Trim',
        id: 'production-cut-sew',
        quantity: unitsToProduce,
        unitPriceCents: getProductionCutSewCostCents(unitsToProduce, patternComplexity)
      }),
      new LineItem({
        title: 'Materials',
        id: 'production-materials',
        quantity: unitsToProduce,
        unitPriceCents: getTotalPerUnitOptionCostCents()
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
        unitPriceCents: pricing.PACKAGING_PER_GARMENT_COST_CENTS
      }),
      new LineItem({
        title: 'Shipping label',
        id: 'fulfillment-shipping',
        quantity: unitsToProduce,
        unitPriceCents: pricing.PACKAGING_PER_GARMENT_COST_CENTS
      })
    ]
  });

  const profitGroup = new Group({
    title: 'Gross Profit per garment',

    lineItems: [
      new ProfitLineItem({
        title: 'Revenue',
        id: 'profit-revenue',
        quantity: unitsToProduce,
        totalCents: design.retailPriceCents
      }),
      new ProfitLineItem({
        title: 'Development',
        quantity: 1,
        id: 'profit-development',
        totalCents: developmentGroup.getTotalCostCents()
      }),
      new ProfitLineItem({
        title: 'Development',
        quantity: unitsToProduce,
        id: 'profit-production',
        totalCents: productionGroup.getTotalCostCents()
      }),
      new ProfitLineItem({
        title: 'Fulfillment',
        quantity: unitsToProduce,
        id: 'profit-fulfillment',
        totalCents: fulfillmentGroup.getTotalCostCents()
      })
    ]
  });

  const groups = [
    developmentGroup,
    materialsGroup,
    productionGroup,
    fulfillmentGroup,
    profitGroup
  ];

  return new Table({
    summary,
    groups
  });
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
