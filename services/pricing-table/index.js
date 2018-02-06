'use strict';

const flatten = require('lodash/flatten');
const pick = require('lodash/pick');

const MissingPrerequisitesError = require('../../errors/missing-prerequisites');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignOptionsDAO = require('../../dao/product-design-options');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const ProductDesignSelectedOptionsDAO = require('../../dao/product-design-selected-options');
const ProductDesignServicesDAO = require('../../dao/product-design-services');
const ProductDesignVariantsDAO = require('../../dao/product-design-variants');
const ProductionPricesDAO = require('../../dao/production-prices');
const { getServicePrice, NoBucketError } = require('../get-service-price');
const { requireProperties, requireValues } = require('../require-properties');

// Should be kept in sync with the enum of `product_design_service_ids` in the
// database.
const SERVICE_IDS = Object.freeze({
  DESIGN: 'Design Consulting',
  DIGITAL_SUBLIMATION_PRINT: 'Digital Sublimation Print',
  DTG_ENGINEERED_PRINT: 'DTG Engineered Print',
  DTG_ROLL_PRINT: 'DTG Roll Print',
  DYE: 'Dye',
  EMBROIDERY: 'Embroidery',
  FULFILLMENT: 'Fulfillment',
  GRADING: 'Grading',
  PATTERN_MAKING: 'Pattern Making',
  PRODUCTION: 'Production',
  ROTARY_PRINT: 'Rotary Print',
  SAMPLING: 'Sampling',
  SCREEN_PRINT: 'Screen Print',
  SOURCING: 'Sourcing',
  TECHNICAL_DESIGN: 'Technical Design',
  WASH: 'Wash'
});

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
    const keys = [
      'lineItems',
      'title',
      'totalProfitCents',
      'unitProfitCents',
      'marginPercentage'
    ];

    requireProperties(data, ...keys);
    Object.assign(this, pick(data, keys));
  }
}

class Summary {
  constructor(data) {
    requireProperties(data,
      'upfrontCostCents',
      'preProductionCostCents',
      'uponCompletionCostCents',
      'fulfillmentCostCents'
    );

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

function getOptionSetupCostCents({ selectedOption, option }) {
  requireValues({ selectedOption, option });

  return option.setupCostCents || 0;
}

function getOptionPerUnitCostCents({ selectedOption, option }) {
  requireValues({ selectedOption, option });

  return option.perMeterCostCents || option.unitCostCents || 0;
}

async function attachOption(selectedOption) {
  const option = await ProductDesignOptionsDAO.findById(selectedOption.optionId);
  selectedOption.setOption(option);
  return selectedOption;
}

class PricingCalculator {
  // Instance values:
  // design: ProductDesign
  // unitsToProduce: number
  // pricesByService: { [serviceId: ServiceId]: ProductionPrice[] }
  // complexityByService: { [serviceId: ServiceId]: number }

  constructor(design) {
    this.design = design;
  }

  getDyeCostCents({ selectedOption }) {
    requireValues({ selectedOption });

    if (!hasDye(selectedOption)) { return 0; }
    return this.getServicePerMeterCostCents('DYE') * selectedOption.unitsRequiredPerGarment;
  }

  getWashCostCents({ selectedOption }) {
    requireValues({ selectedOption });

    if (!hasDye(selectedOption)) { return 0; }
    return this.getServicePerMeterCostCents('WASH') * selectedOption.unitsRequiredPerGarment;
  }

  getDyeSetupCostCents({ selectedOption }) {
    requireValues({ selectedOption });

    return hasDye(selectedOption) ? this.getServiceSetupCostCents('DYE') : 0;
  }

  getWashSetupCostCents({ selectedOption }) {
    requireValues({ selectedOption });

    return hasWash(selectedOption) ? this.getServiceSetupCostCents('WASH') : 0;
  }

  // Get the cost to do a feature placement (image print / embroidery) on each
  // garment. Either a fixed cost (stuff like screenprinting) or a per-yard cost
  // multiplied by the number of yards required (stuff like roll prints).
  getFeaturePlacementCostCents({ featurePlacement }) {
    requireValues({ featurePlacement });

    if (!featurePlacement.processName) {
      throw new MissingPrerequisitesError('Artwork is missing application type');
    }

    switch (featurePlacement.processName) {
      case 'DTG_ROLL':
        return this.getServicePerGarmentCostCents('DTG_ROLL_PRINT');
      case 'DTG_ENGINEERED':
        return this.getServicePerGarmentCostCents('DTG_ENGINEERED_PRINT');
      case 'DIGITAL_SUBLIMATION':
        return this.getServicePerGarmentCostCents('DIGITAL_SUBLIMATION_PRINT');
      case 'ROTARY_PRINT':
        return this.getServicePerGarmentCostCents('ROTARY_PRINT');
      case 'SCREEN_PRINT':
        return this.getServicePerGarmentCostCents('SCREEN_PRINT');
      case 'EMBROIDERY':
        return this.getServicePerGarmentCostCents('EMBROIDERY');

      default:
        throw new Error(`Unknown process name: ${featurePlacement.processName}`);
    }
  }

  getFeaturePlacementSetupCostCents(data) {
    requireProperties(data, 'featurePlacement');
    const { featurePlacement } = data;

    if (!featurePlacement.processName) {
      throw new MissingPrerequisitesError('Artwork is missing application type');
    }

    switch (featurePlacement.processName) {
      case 'DTG_ROLL':
        return this.getServiceSetupCostCents('DTG_ROLL_PRINT');
      case 'DTG_ENGINEERED':
        return this.getServiceSetupCostCents('DTG_ENGINEERED_PRINT');
      case 'DIGITAL_SUBLIMATION':
        return this.getServiceSetupCostCents('DIGITAL_SUBLIMATION_PRINT');
      case 'ROTARY_PRINT':
        return this.getServiceSetupCostCents('ROTARY_PRINT');
      case 'SCREEN_PRINT':
        return this.getServiceSetupCostCents('SCREEN_PRINT');
      case 'EMBROIDERY':
        return this.getServiceSetupCostCents('EMBROIDERY');

      default:
        throw new Error(`Unknown process name: ${featurePlacement.processName}`);
    }
  }

  getServicePriceBucket(serviceId, expectedUnit) {
    const allowedServiceIds = Object.keys(SERVICE_IDS);

    if (allowedServiceIds.indexOf(serviceId) < 0) {
      throw new Error(`Price bucket requested for unknown service: ${serviceId}`);
    }

    const prices = this.pricesByService[serviceId];

    if (!prices) {
      throw new Error(`No prices were retreived for service ${serviceId}`);
    }

    if (prices.length === 0) {
      throw new MissingPrerequisitesError(`Partner has not set up pricing for ${serviceId}`);
    }

    const complexity = this.complexityByService[serviceId];

    if (complexity === undefined) {
      throw new Error(`No complexity was retreived for service ${serviceId}`);
    }

    let bucket;

    try {
      bucket = getServicePrice({
        productionPrices: prices,
        serviceId,
        unitsToProduce: this.unitsToProduce,
        complexityLevel: complexity
      });
    } catch (err) {
      if (err instanceof NoBucketError) {
        throw new MissingPrerequisitesError(`Pricing for the ${serviceId} service doesn't match any tier in the pricing table`);
      }

      throw err;
    }

    if (expectedUnit && bucket.priceUnit !== expectedUnit) {
      throw new MissingPrerequisitesError(
        `${serviceId} service has pricing, but in the wrong units. ` +
        `Expected prices per ${expectedUnit}, got prices per ${bucket.priceUnit}.`
      );
    }

    return bucket;
  }

  // All these helpers are slightly foolproof guards around the same action -
  // get the price list and find the one that matches
  getServicePerMeterCostCents(serviceId) {
    return this.getServicePriceBucket(serviceId, 'METER').priceCents;
  }

  getServicePerDesignCostCents(serviceId) {
    return this.getServicePriceBucket(serviceId, 'DESIGN').priceCents;
  }

  getServicePerGarmentCostCents(serviceId) {
    return this.getServicePriceBucket(serviceId, 'GARMENT').priceCents;
  }

  getServicePerSizeCostCents(serviceId) {
    return this.getServicePriceBucket(serviceId, 'SIZE').priceCents;
  }

  getServiceSetupCostCents(serviceId) {
    return this.getServicePriceBucket(serviceId).setupCostCents;
  }

  async fetchServicesAndPricing() {
    const services = await ProductDesignServicesDAO.findByDesignId(this.design.id);

    this.pricesByService = {};
    this.complexityByService = {};

    for (const service of services) {
      this.complexityByService[service.serviceId] = service.complexityLevel;

      if (!service.vendorUserId) {
        throw new MissingPrerequisitesError(`Service ${service.serviceId} is not assigned to any partner`);
      }

      if (service.complexityLevel === null) {
        throw new MissingPrerequisitesError(`Service ${service.serviceId} has no specified complexity level`);
      }

      const prices = await ProductionPricesDAO.findByVendorAndService(
        service.vendorUserId,
        service.serviceId
      );

      this.pricesByService[service.serviceId] = prices;
    }

    return services;
  }

  async getComputedPricingTable() {
    const { design } = this;

    const {
      retailPriceCents,
      status
    } = design;

    this.unitsToProduce = await ProductDesignVariantsDAO.getTotalUnitsToProduce(design.id);

    const sizes = await ProductDesignVariantsDAO.getSizes(design.id);
    const numberOfSizes = Math.max(sizes.length, 1);

    if (this.unitsToProduce === 0) {
      throw new MissingPrerequisitesError('Design must specify number of units to produce');
    }

    if (!retailPriceCents) {
      throw new MissingPrerequisitesError('Design must specify retail price');
    }

    const selectedBare = await ProductDesignSelectedOptionsDAO.findByDesignId(design.id);
    const selectedOptions = await Promise.all(selectedBare.map(attachOption));

    const allSections = await ProductDesignSectionsDAO.findByDesignId(design.id);
    const sections = allSections.filter(section => section.type === 'FLAT_SKETCH');

    const services = await this.fetchServicesAndPricing();

    const enabledServices = {};
    services.forEach((service) => { enabledServices[service.serviceId] = true; });

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

    if (!isPricingReviewed) {
      if (!isAllTemplates) {
        throw new MissingPrerequisitesError('Custom sketches need to be reviewed before we can give a price quote');
      }

      if (enabledServices.DESIGN) {
        throw new MissingPrerequisitesError('The design phase needs to be complete before we can give a price quote');
      }
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
        enabledServices.PATTERN_MAKING && new LineItem({
          title: 'Pattern Making',
          id: 'development-patternmaking',
          quantity: 1,
          unitPriceCents: this.getServicePerDesignCostCents('PATTERN_MAKING')
        }),
        enabledServices.GRADING && new LineItem({
          title: 'Marking & Grading',
          id: 'development-grading',
          quantity: numberOfSizes,
          unitPriceCents: this.getServicePerSizeCostCents('GRADING')
        }),
        enabledServices.SOURCING && new LineItem({
          title: 'Sourcing/Testing',
          id: 'development-sourcing',
          quantity: 1,
          unitPriceCents: this.getServicePerDesignCostCents('SOURCING')
        }),
        enabledServices.TECHNICAL_DESIGN && new LineItem({
          title: 'Technical Design',
          id: 'development-technical-design',
          quantity: 1,
          unitPriceCents: this.getServicePerDesignCostCents('TECHNICAL_DESIGN')
        }),
        enabledServices.SAMPLING && new LineItem({
          title: 'Sampling',
          id: 'development-sampling',
          quantity: 1,
          unitPriceCents: this.getServicePerDesignCostCents('SAMPLING')
        })
      ].filter(Boolean)
    });

    selectedOptions.forEach((selectedOption) => {
      if (!enabledServices.SAMPLING) { return; }

      if (hasDye(selectedOption)) {
        const dyeSetupCost = this.getDyeSetupCostCents({ selectedOption });
        const dyeCost = this.getDyeCostCents({ selectedOption });

        developmentGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricDyeProcessName} — Dye sample`,
          id: `${selectedOption.id}-dye-sample`,
          quantity: 1,
          unitPriceCents: dyeSetupCost + dyeCost
        }));
      }

      if (hasWash(selectedOption)) {
        const washSetupCost = this.getWashSetupCostCents({ selectedOption });
        const washCost = this.getWashCostCents({ selectedOption });

        developmentGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricWashProcessName} — Wash sample`,
          id: `${selectedOption.id}-wash-sample`,
          quantity: 1,
          unitPriceCents: washSetupCost + washCost
        }));
      }
    });

    featurePlacements.forEach((featurePlacement) => {
      if (!enabledServices.SAMPLING) { return; }

      const setupCost = this.getFeaturePlacementSetupCostCents({ featurePlacement });
      const cost = this.getFeaturePlacementCostCents({ featurePlacement });

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

      lineItems: []
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
        const dyeCost = this.getDyeCostCents({ selectedOption });

        materialsGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricDyeProcessName} — Dye`,
          id: `${selectedOption.id}-dye-sample`,
          quantity: 1,
          unitPriceCents: dyeCost
        }));
      }

      if (hasWash(selectedOption)) {
        const washCost = this.getWashCostCents({ selectedOption });

        materialsGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricWashProcessName} — Wash`,
          id: `${selectedOption.id}-wash-sample`,
          quantity: 1,
          unitPriceCents: washCost
        }));
      }
    });

    featurePlacements.forEach((featurePlacement) => {
      const cost = this.getFeaturePlacementCostCents({ featurePlacement });

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
        enabledServices.PRODUCTION && new LineItem({
          title: 'Cut, Sew, Trim',
          id: 'production-cut-sew',
          quantity: this.unitsToProduce,
          unitPriceCents: this.getServicePerGarmentCostCents('PRODUCTION')
        }),
        enabledServices.PRODUCTION && new LineItem({
          title: 'Materials',
          id: 'production-materials',
          quantity: this.unitsToProduce,
          unitPriceCents: materialsGroup.getTotalPriceCents()
        })
      ].filter(Boolean)
    });

    selectedOptions.forEach((selectedOption) => {
      if (!enabledServices.PRODUCTION) { return; }

      const { option } = selectedOption;

      productionGroup.addLineItem(new LineItem({
        title: `${option.title} — Setup`,
        id: `${selectedOption.id}-setup`,
        quantity: 1,
        unitPriceCents: getOptionSetupCostCents({ option, selectedOption })
      }));

      if (hasDye(selectedOption)) {
        const dyeSetupCost = this.getDyeSetupCostCents({ selectedOption });

        productionGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricDyeProcessName} — Setup`,
          id: `${selectedOption.id}-dye-setup`,
          quantity: 1,
          unitPriceCents: dyeSetupCost
        }));
      }

      if (hasWash(selectedOption)) {
        const washSetupCost = this.getWashSetupCostCents({ selectedOption });

        productionGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricWashProcessName} — Setup`,
          id: `${selectedOption.id}-wash-setup`,
          quantity: 1,
          unitPriceCents: washSetupCost
        }));
      }
    });

    featurePlacements.forEach((featurePlacement) => {
      if (!enabledServices.PRODUCTION) { return; }

      const cost = this.getFeaturePlacementSetupCostCents({ featurePlacement });

      const process = getFeatureFriendlyProcessName(featurePlacement);

      productionGroup.addLineItem(new LineItem({
        title: `${process} — Setup`,
        id: `${featurePlacement.id}-setup`,
        quantity: 1,
        unitPriceCents: cost
      }));
    });

    const productionPerUnit = Math.round(
      productionGroup.getTotalPriceCents() / this.unitsToProduce
    );

    productionGroup.setGroupPriceCents(productionPerUnit);

    const fulfillmentGroup = new Group({
      title: 'Fulfillment per garment',
      totalLabel: 'Total Fulfillment',

      columnTitles: {
        title: 'Name',
        quantity: 'Quantity',
        unitPriceCents: 'Price',
        totalPriceCents: 'Total'
      },

      lineItems: [
        enabledServices.FULFILLMENT && new LineItem({
          title: 'Fulfillment',
          id: 'fulfillment',
          quantity: this.unitsToProduce,
          unitPriceCents: this.getServicePerGarmentCostCents('FULFILLMENT')
        })
      ].filter(Boolean)
    });

    const fulfillmentPerUnit = Math.round(
      fulfillmentGroup.getTotalPriceCents() / this.unitsToProduce
    );
    fulfillmentGroup.setGroupPriceCents(fulfillmentPerUnit);

    const totalCost = developmentGroup.getTotalPriceCents() +
      productionGroup.getTotalPriceCents() +
      fulfillmentGroup.getTotalPriceCents();

    const totalRevenue = design.retailPriceCents * this.unitsToProduce;
    const totalProfitCents = totalRevenue - totalCost;
    const unitProfitCents = Math.round(totalProfitCents / this.unitsToProduce);

    const marginPercentage = Math.round(
      (1 - (totalCost / totalRevenue)) * 100
    );

    const profitGroup = new ProfitGroup({
      title: 'Gross Profit per garment',
      unitProfitCents,
      totalProfitCents,
      marginPercentage,

      lineItems: [
        new LineItem({
          title: 'Revenue',
          id: 'profit-revenue',
          quantity: this.unitsToProduce,
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
          quantity: this.unitsToProduce,
          id: 'profit-production',
          unitPriceCents: productionGroup.getTotalPriceCents()
        }),
        new LineItem({
          title: 'Fulfillment',
          quantity: this.unitsToProduce,
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

  getFinalPricingTable(computedPricingTable) {
    const override = this.design.overridePricingTable;
    const merged = mergePricingTables(computedPricingTable, override);

    return merged;
  }

  async getAllPricingTables() {
    const computedPricingTable = await this.getComputedPricingTable();
    const finalPricingTable = this.getFinalPricingTable(computedPricingTable);
    const overridePricingTable = this.design.overridePricingTable;

    return {
      computedPricingTable,
      finalPricingTable,
      overridePricingTable
    };
  }
}

module.exports = PricingCalculator;
