'use strict';

// const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
// const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const MissingPrerequisitesError = require('../../errors/missing-prerequisites');
const getCutAndSewCost = require('../../services/get-cut-and-sew-cost');
const pricing = require('../../config/pricing');
const ProductDesignOptionsDAO = require('../../dao/product-design-options');
const ProductDesignSelectedOptionsDAO = require('../../dao/product-design-selected-options');
const { requireProperties, assert } = require('../../services/require-properties');

class LineItem {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.quantity = data.quantity;
    this.unitPriceCents = data.unitPriceCents;

    this.totalPriceCents = this.getTotalPriceCents();
  }

  getTotalPriceCents() {
    return this.quantity * this.unitPriceCents;
  }
}

class Group {
  constructor(data) {
    this.lineItems = data.lineItems;
    this.title = data.title;
    this.totalPriceCents = this.getTotalPriceCents();
    this.totalLabel = data.totalLabel;
    this.groupPriceCents = data.groupPriceCents;
    this.columnTitles = data.columnTitles;
  }

  getTotalPriceCents() {
    return this.lineItems.reduce((memo, item) =>
      memo + item.getTotalPriceCents()
      , 0);
  }

  getUnitPriceCents() {
    return this.lineItems.reduce((memo, item) =>
      memo + item.unitPriceCents
      , 0);
  }

  setGroupPriceCents(cents) {
    this.groupPriceCents = cents;
  }
}

class ProfitGroup {
  constructor(data) {
    this.lineItems = data.lineItems;
    this.title = data.title;
    this.totalProfitCents = data.totalProfitCents;
    this.unitProfitCents = data.unitProfitCents;
  }
}

class Summary {
  constructor(data) {
    this.upfrontCostCents = data.upfrontCostCents;
    this.preProductionCostCents = data.preProductionCostCents;
    this.uponCompletionCostCents = data.uponCompletionCostCents;
  }
}

class Table {
  constructor(data) {
    requireProperties(data, 'summary', 'groups', 'profit');
    this.summary = data.summary;
    this.groups = data.groups;
    this.profit = data.profit;
  }
}

function mergePricingTables(computed) {
  return computed;
}

// The total cost of all "options" (fabrics + trims) required to make one
// garment
function getTotalPerUnitOptionCostCents(data) {
  requireProperties(data, 'selectedOptions', 'options');
  return 0;
}

// function getSelectedOptionDyeCostCents(data) {
//   requireProperties(data, 'selectedOption');
//   const { selectedOption } = data;
//
//   const hasDye = Boolean(selectedOption.fabricDyeProcessName);
//
//   if (hasDye) {
//     const dyeCost = pricing.DYE_PER_YARD_COST_CENTS * selectedOption.unitsRequiredPerGarment;
//     return dyeCost;
//   }
//
//   return 0;
// }

// function getSelectedOptionDyeSetupCostCents(data) {
//   requireProperties(data, 'selectedOption');
//   const { selectedOption } = data;
//
//   const hasDye = Boolean(selectedOption.fabricDyeProcessName);
//   return hasDye ? pricing.DYE_SETUP_COST_CENTS : 0;
// }
//
// // Get the cost to do a feature placement (image print / embroidery) on each
// // garment. Either a fixed cost (stuff like screenprinting) or a per-yard cost
// // multiplied by the number of yards required (stuff like roll prints).
// function getFeaturePlacementPerUnitCostCents(data) {
//   requireProperties(data, 'featurePlacement');
//   const { featurePlacement } = data;
//   return 0;
// }
//
// function getFeaturePlacementSetupCostCents({ featurePlacement }) {
//   requireProperties(data, 'featurePlacement');
//   return 0;
// }

async function getComputedPricingTable(design) {
  const {
    unitsToProduce,
    retailPriceCents,
    sourcingComplexity,
    patternComplexity
  } = design;

  if (!unitsToProduce) {
    throw new MissingPrerequisitesError('Design must specify number of units to produce');
  }

  if (!retailPriceCents) {
    throw new MissingPrerequisitesError('Design must specify retail price');
  }

  const selectedOptions = await ProductDesignSelectedOptionsDAO.findByDesignId(design.id);
  // const sections = await ProductDesignSectionsDAO.findByDesignId(design.id);

  // const featurePlacements = await flatten(Promise.all(
  //   sections.map(section =>
  //     ProductDesignFeaturePlacementsDAO.findBySectionId(section.id)
  //   )
  // ));

  const options = await Promise.all(
    selectedOptions.map(selectedOption =>
      ProductDesignOptionsDAO.findById(selectedOption.optionId)
    )
  );

  // const perUnitOptionCostCents = getPerUnitOptionCostCents({ options, selectedOptions });

  const developmentGroup = new Group({
    title: 'Development',
    totalLabel: 'Total Development',

    columnTitles: {
      title: 'Process',
      quantity: 'Quantity',
      unitPriceCents: 'Price',
      totalPriceCents: 'Total'
    },

    lineItems: [
      new LineItem({
        title: 'Pattern Making',
        id: 'development-patternmaking',
        quantity: 1,
        unitPriceCents: pricing.PATTERN_MAKING_COST_CENTS[patternComplexity]
      }),
      new LineItem({
        title: 'Sourcing/Testing',
        id: 'development-sourcing',
        quantity: 1,
        unitPriceCents: pricing.SOURCING_COST_CENTS[sourcingComplexity]
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
        unitPriceCents: pricing.SAMPLE_CUT_AND_SEW_COST_CENTS[patternComplexity]
      })
    ]
  });

  developmentGroup.setGroupPriceCents(developmentGroup.getTotalPriceCents());

  const materialsGroup = new Group({
    title: 'Materials & processes per garment',
    totalLabel: 'Total Materials per Garment',

    columnTitles: {
      title: 'Material/Process',
      quantity: 'Quantity',
      unitPriceCents: 'Price per',
      totalPriceCents: 'Total'
    },

    lineItems: [
    ]
  });

  materialsGroup.setGroupPriceCents(materialsGroup.getUnitPriceCents());

  const productionGroup = new Group({
    title: 'Production per garment',
    totalLabel: 'Total Production',

    columnTitles: {
      title: 'Name',
      quantity: 'Quantity',
      unitPriceCents: 'Price per',
      totalPriceCents: 'Total'
    },

    lineItems: [
      new LineItem({
        title: 'Cut, Sew, Trim',
        id: 'production-cut-sew',
        quantity: unitsToProduce,
        unitPriceCents: getCutAndSewCost(unitsToProduce, patternComplexity)
      }),
      new LineItem({
        title: 'Materials',
        id: 'production-materials',
        quantity: unitsToProduce,
        unitPriceCents: getTotalPerUnitOptionCostCents({ selectedOptions, options })
      })
      // SETUP FEES HERE
    ]
  });

  productionGroup.setGroupPriceCents(productionGroup.getUnitPriceCents());

  const fulfillmentGroup = new Group({
    title: 'Fulfillment per garment',
    totalLabel: 'Total Fulfillment',
    groupPriceCents: 0,

    columnTitles: {
      title: 'Name',
      quantity: 'Quantity',
      unitPriceCents: 'Price',
      totalPriceCents: 'Total'
    },

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

  fulfillmentGroup.setGroupPriceCents(fulfillmentGroup.getUnitPriceCents());

  const profitGroup = new ProfitGroup({
    title: 'Gross Profit per garment',
    unitProfitCents: 0,
    totalProfitCents: 0,

    lineItems: [
      new LineItem({
        title: 'Revenue',
        id: 'profit-revenue',
        quantity: unitsToProduce,
        unitPriceCents: design.retailPriceCents
      }),
      new LineItem({
        title: 'Development',
        quantity: 1,
        id: 'profit-development',
        unitPriceCents: developmentGroup.getTotalPriceCents()
      }),
      new LineItem({
        title: 'Development',
        quantity: unitsToProduce,
        id: 'profit-production',
        unitPriceCents: productionGroup.getTotalPriceCents()
      }),
      new LineItem({
        title: 'Fulfillment',
        quantity: unitsToProduce,
        id: 'profit-fulfillment',
        unitPriceCents: fulfillmentGroup.getTotalPriceCents()
      })
    ]
  });

  const portionCost = Math.round(productionGroup.getTotalPriceCents() / 2);

  const summary = new Summary({
    upfrontCostCents: developmentGroup.getTotalPriceCents(),
    preProductionCostCents: portionCost,
    uponCompletionCostCents: portionCost
  });

  const groups = [
    developmentGroup,
    materialsGroup,
    productionGroup,
    fulfillmentGroup
  ];

  return new Table({
    summary,
    groups,
    profit: profitGroup
  });
}

async function getFinalPricingTable(design, computedPricingTable) {
  assert(design, 'Missing design');
  assert(computedPricingTable, 'Missing computed pricing table');

  const override = design.overridePricingTable;
  const merged = mergePricingTables(computedPricingTable, override);

  return merged;
}

module.exports = {
  getComputedPricingTable,
  getFinalPricingTable
};
