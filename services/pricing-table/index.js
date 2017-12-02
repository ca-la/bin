'use strict';

const flatten = require('lodash/flatten');

const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
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

  setGroupPriceCents(cents) {
    this.groupPriceCents = cents;
  }

  addLineItem(lineItem) {
    const lineItems = (this.lineItems || []).concat(lineItem);
    this.lineItems = lineItems;
    this.totalPriceCents = this.getTotalPriceCents();
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
    this.fulfillmentCostCents = data.fulfillmentCostCents;
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

function hasDye(selectedOption) {
  return Boolean(selectedOption.fabricDyeProcessName);
}

function hasWash(selectedOption) {
  return Boolean(selectedOption.fabricWashProcessName);
}

function getOptionSetupCostCents(data) {
  requireProperties(data, 'selectedOption', 'option');
  const { option } = data;

  return option.setupCostCents || 0;
}

function getOptionPerUnitCostCents(data) {
  requireProperties(data, 'selectedOption', 'option');
  const { option } = data;

  return option.perMeterCostCents || option.unitCostCents || 0;
}

function getDyeCostCents(data) {
  requireProperties(data, 'selectedOption');
  const { selectedOption } = data;

  if (!hasDye(selectedOption)) { return 0; }
  return pricing.DYE_PER_YARD_COST_CENTS * selectedOption.unitsRequiredPerGarment;
}

function getWashCostCents(data) {
  requireProperties(data, 'selectedOption');
  const { selectedOption } = data;

  if (!hasDye(selectedOption)) { return 0; }
  return pricing.DYE_PER_YARD_COST_CENTS * selectedOption.unitsRequiredPerGarment;
}

function getDyeSetupCostCents(data) {
  requireProperties(data, 'selectedOption');
  const { selectedOption } = data;

  return hasDye(selectedOption) ? pricing.DYE_SETUP_COST_CENTS : 0;
}

function getWashSetupCostCents(data) {
  requireProperties(data, 'selectedOption');
  const { selectedOption } = data;

  return hasWash(selectedOption) ? pricing.WASH_SETUP_COST_CENTS : 0;
}

// Get the cost to do a feature placement (image print / embroidery) on each
// garment. Either a fixed cost (stuff like screenprinting) or a per-yard cost
// multiplied by the number of yards required (stuff like roll prints).
function getFeaturePlacementCostCents(data) {
  requireProperties(data, 'featurePlacement');
  const { featurePlacement } = data;

  switch (featurePlacement.processName) {
    case 'EMBROIDERY': {
      const largestDimension = Math.max(featurePlacement.width, featurePlacement.height);

      if (largestDimension > 220) { return pricing.EMBROIDERY_COST_CENTS[2]; }
      if (largestDimension > 130) { return pricing.EMBROIDERY_COST_CENTS[1]; }

      return pricing.EMBROIDERY_COST_CENTS[0];
    }

    case 'SCREEN_PRINT':
      return pricing.SCREEN_PRINT_PER_GARMENT_COST_CENTS;

    default: {
      // TODO determine somehow? Based on panel? Doesn't really make sense w/
      // the current way that we model feature placements
      const yardsRequiredPerGarment = 1;
      const pricePerYard = pricing.FEATURE_PER_YARD_COST_CENTS[featurePlacement.processName] || 0;
      return yardsRequiredPerGarment * pricePerYard;
    }
  }
}

function getFeaturePlacementSetupCostCents(data) {
  requireProperties(data, 'featurePlacement');
  const { featurePlacement } = data;

  return pricing.FEATURE_SETUP_COST_CENTS[featurePlacement.processName] || 0;
}

function getFeatureFriendlyProcessName(featurePlacement) {
  switch (featurePlacement.processName) {
    case 'DTG_ROLL': return 'DTG Roll Print';
    case 'DTG_ENGINEERED': return 'DTG Engineered Pattern';
    case 'DIGITAL_SUBLIMATION': return 'Digital Sublimation';
    case 'ROTARY_PRINT': return 'Rotary Print';
    case 'SCREEN_PRINT': return 'Screen Print';
    case 'EMBROIDERY': return 'Embroidery';
    default: return 'Print';
  }
}

async function getComputedPricingTable(design) {
  const {
    unitsToProduce,
    retailPriceCents,
    sourcingComplexity,
    patternComplexity,
    productionComplexity,
    sampleComplexity,
    status
  } = design;

  if (!unitsToProduce) {
    throw new MissingPrerequisitesError('Design must specify number of units to produce');
  }

  if (!retailPriceCents) {
    throw new MissingPrerequisitesError('Design must specify retail price');
  }

  function attachOption(selectedOption) {
    return ProductDesignOptionsDAO.findById(selectedOption.optionId)
      .then((option) => {
        selectedOption.setOption(option);
        return selectedOption;
      });
  }

  const selectedBare = await ProductDesignSelectedOptionsDAO.findByDesignId(design.id);
  const selectedOptions = await Promise.all(selectedBare.map(attachOption));

  const allSections = await ProductDesignSectionsDAO.findByDesignId(design.id);
  const sections = allSections.filter(section => section.type === 'FLAT_SKETCH');

  const isAllTemplates = sections.reduce((memo, section) => {
    if (!section.templateName) {
      return false;
    }

    return memo;
  }, true);

  const isPricingReviewed = (
    status !== 'DRAFT' &&
    status !== 'IN_REVIEW'
  );

  if (!isAllTemplates && !isPricingReviewed) {
    throw new MissingPrerequisitesError('Custom sketches need to be reviewed for complexity');
  }

  const featurePlacementsPerSection = await Promise.all(
    sections.map(section =>
      ProductDesignFeaturePlacementsDAO.findBySectionId(section.id)
    )
  );
  const featurePlacements = flatten(featurePlacementsPerSection);

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
        unitPriceCents: pricing.SAMPLE_CUT_AND_SEW_COST_CENTS[sampleComplexity]
      })
    ]
  });

  selectedOptions.forEach((selectedOption) => {
    if (hasDye(selectedOption)) {
      const dyeSetupCost = getDyeSetupCostCents({ selectedOption });
      const dyeCost = getDyeCostCents({ selectedOption });

      developmentGroup.addLineItem(new LineItem({
        title: `${selectedOption.fabricDyeProcessName} — Dye sample`,
        id: `${selectedOption.id}-dye-sample`,
        quantity: 1,
        unitPriceCents: dyeSetupCost + dyeCost
      }));
    }

    if (hasWash(selectedOption)) {
      const washSetupCost = getWashSetupCostCents({ selectedOption });
      const washCost = getWashCostCents({ selectedOption });

      developmentGroup.addLineItem(new LineItem({
        title: `${selectedOption.fabricWashProcessName} — Wash sample`,
        id: `${selectedOption.id}-wash-sample`,
        quantity: 1,
        unitPriceCents: washSetupCost + washCost
      }));
    }
  });

  featurePlacements.forEach((featurePlacement) => {
    const setupCost = getFeaturePlacementSetupCostCents({ featurePlacement });
    const cost = getFeaturePlacementCostCents({ featurePlacement });

    const process = getFeatureFriendlyProcessName(featurePlacement);

    developmentGroup.addLineItem(new LineItem({
      title: `${process} (Sample)`,
      id: `${featurePlacement.id}-sample`,
      quantity: 1,
      unitPriceCents: setupCost + cost
    }));
  });

  developmentGroup.setGroupPriceCents(developmentGroup.getTotalPriceCents());

  const materialsGroup = new Group({
    title: 'Materials & processes per garment',
    totalLabel: 'Total Materials & Processes per garment',

    columnTitles: {
      title: 'Material/Process',
      quantity: 'Quantity',
      unitPriceCents: 'Price per',
      totalPriceCents: 'Total'
    },

    lineItems: [
    ]
  });

  selectedOptions.forEach((selectedOption) => {
    const { option } = selectedOption;

    materialsGroup.addLineItem(new LineItem({
      title: option.title,
      id: `${selectedOption.id}-fabric-or-trim`,
      quantity: selectedOption.unitsRequiredPerGarment,
      unitPriceCents: getOptionPerUnitCostCents({ option, selectedOption })
    }));

    if (hasDye(selectedOption)) {
      const dyeCost = getDyeCostCents({ selectedOption });

      materialsGroup.addLineItem(new LineItem({
        title: `${selectedOption.fabricDyeProcessName} — Dye`,
        id: `${selectedOption.id}-dye-sample`,
        quantity: 1,
        unitPriceCents: dyeCost
      }));
    }

    if (hasWash(selectedOption)) {
      const washCost = getWashCostCents({ selectedOption });

      materialsGroup.addLineItem(new LineItem({
        title: `${selectedOption.fabricWashProcessName} — Wash`,
        id: `${selectedOption.id}-wash-sample`,
        quantity: 1,
        unitPriceCents: washCost
      }));
    }
  });

  featurePlacements.forEach((featurePlacement) => {
    const cost = getFeaturePlacementCostCents({ featurePlacement });

    const process = getFeatureFriendlyProcessName(featurePlacement);

    materialsGroup.addLineItem(new LineItem({
      title: process,
      id: `${featurePlacement.id}-print`,
      quantity: 1,
      unitPriceCents: cost
    }));
  });

  materialsGroup.setGroupPriceCents(materialsGroup.getTotalPriceCents());

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
        unitPriceCents: getCutAndSewCost(unitsToProduce, productionComplexity)
      }),
      new LineItem({
        title: 'Materials',
        id: 'production-materials',
        quantity: unitsToProduce,
        unitPriceCents: materialsGroup.getTotalPriceCents()
      })
    ]
  });

  selectedOptions.forEach((selectedOption) => {
    const { option } = selectedOption;

    productionGroup.addLineItem(new LineItem({
      title: `${option.title} — Setup`,
      id: `${selectedOption.id}-setup`,
      quantity: 1,
      unitPriceCents: getOptionSetupCostCents({ option, selectedOption })
    }));

    if (hasDye(selectedOption)) {
      const dyeSetupCost = getDyeSetupCostCents({ selectedOption });

      productionGroup.addLineItem(new LineItem({
        title: `${selectedOption.fabricDyeProcessName} — Setup`,
        id: `${selectedOption.id}-dye-setup`,
        quantity: 1,
        unitPriceCents: dyeSetupCost
      }));
    }

    if (hasWash(selectedOption)) {
      const washSetupCost = getWashSetupCostCents({ selectedOption });

      productionGroup.addLineItem(new LineItem({
        title: `${selectedOption.fabricWashProcessName} — Setup`,
        id: `${selectedOption.id}-wash-setup`,
        quantity: 1,
        unitPriceCents: washSetupCost
      }));
    }
  });

  featurePlacements.forEach((featurePlacement) => {
    const cost = getFeaturePlacementSetupCostCents({ featurePlacement });

    const process = getFeatureFriendlyProcessName(featurePlacement);

    productionGroup.addLineItem(new LineItem({
      title: `${process} — Setup`,
      id: `${featurePlacement.id}-setup`,
      quantity: 1,
      unitPriceCents: cost
    }));
  });

  const productionPerUnit = Math.round(productionGroup.getTotalPriceCents() / unitsToProduce);
  productionGroup.setGroupPriceCents(productionPerUnit);

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

  const fulfillmentPerUnit = Math.round(fulfillmentGroup.getTotalPriceCents() / unitsToProduce);
  fulfillmentGroup.setGroupPriceCents(fulfillmentPerUnit);

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
    uponCompletionCostCents: portionCost,
    fulfillmentCostCents: fulfillmentGroup.getTotalPriceCents()
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
