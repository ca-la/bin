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
const { getServiceBasePrice, NoBucketError } = require('../get-service-price');
const { getServiceMarginCents, getServiceSetupMarginCents } = require('../get-service-margin');
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

class ServicePrice {
  constructor(data) {
    const keys = [
      'serviceCostCents',
      'setupCostCents',
      'serviceMarginCents',
      'setupMarginCents',
      'basePriceCents',
      'baseSetupCostCents'
    ];

    requireProperties(data, ...keys);
    Object.assign(this, pick(data, keys));
  }

  toJSON() {
    return pick(this,
      'serviceCostCents',
      'setupCostCents'
    );
  }
}

// Given a ServicePrice (setup cost + per-unit service cost), multiply values by # of
// units to get a ServicePrice that represents (setup cost + total service cost)
function multiplyServicePriceByUnits(initialPrice, units) {
  requireValues({ initialPrice, units });

  return new ServicePrice({
    serviceCostCents: initialPrice.serviceCostCents * units,
    serviceMarginCents: initialPrice.serviceMarginCents * units,
    basePriceCents: initialPrice.basePriceCents * units,
    baseSetupCostCents: initialPrice.baseSetupCostCents,
    setupCostCents: initialPrice.setupCostCents,
    setupMarginCents: initialPrice.setupMarginCents
  });
}

const ZERO_SERVICE_PRICE = Object.freeze(new ServicePrice({
  basePriceCents: 0,
  baseSetupCostCents: 0,
  serviceCostCents: 0,
  setupCostCents: 0,
  serviceMarginCents: 0,
  setupMarginCents: 0
}));

class LineItem {
  constructor(data) {
    const keys = [
      'id',
      'title',
      'quantity',
      'unitPriceCents',
      'unitMarginCents'
    ];

    requireProperties(data, ...keys);
    Object.assign(this, pick(data, keys));
  }

  getTotalPriceCents() {
    return this.quantity * this.unitPriceCents;
  }

  getTotalMarginCents() {
    return this.quantity * this.unitMarginCents;
  }

  toJSON() {
    // Must not include any margin values here, or they'll be exposed in JSON
    // responses.
    const props = pick(this,
      'id',
      'title',
      'quantity',
      'unitPriceCents'
    );

    return Object.assign(props, {
      totalPriceCents: this.getTotalPriceCents()
    });
  }
}

class Group {
  constructor(data) {
    this.lineItems = data.lineItems;
    this.title = data.title;
    this.totalLabel = data.totalLabel;
    this.groupPriceCents = data.groupPriceCents;
    this.columnTitles = data.columnTitles;
  }

  getTotalPriceCents() {
    return this.lineItems.reduce((memo, item) =>
      memo + item.getTotalPriceCents()
      , 0);
  }

  getTotalMarginCents() {
    return this.lineItems.reduce((memo, item) =>
      memo + item.getTotalMarginCents()
      , 0);
  }

  setGroupPriceCents(cents) {
    this.groupPriceCents = cents;
  }

  addLineItem(lineItem) {
    const lineItems = (this.lineItems || []).concat(lineItem);
    this.lineItems = lineItems;
  }

  toJSON() {
    const props = pick(this,
      'lineItems',
      'title',
      'totalLabel',
      'groupPriceCents',
      'columnTitles'
    );

    return Object.assign(props, {
      totalPriceCents: this.getTotalPriceCents()
    });
  }
}

class DesignerProfitGroup {
  constructor(data) {
    const keys = [
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
    const keys = [
      'upfrontCostCents',
      'preProductionCostCents',
      'uponCompletionCostCents',
      'fulfillmentCostCents',
      'upfrontMarginCents',
      'preProductionMarginCents',
      'uponCompletionMarginCents',
      'fulfillmentMarginCents'
    ];

    requireProperties(data, ...keys);
    Object.assign(this, pick(data, keys));
  }

  toJSON() {
    return pick(this,
      'upfrontCostCents',
      'preProductionCostCents',
      'uponCompletionCostCents',
      'fulfillmentCostCents'
    );
  }
}

class Table {
  constructor(data) {
    const keys = [
      'summary',
      'groups',
      'profit'
    ];

    requireProperties(data, ...keys);
    Object.assign(this, pick(data, keys));
  }

  serializeWithoutBreakdown() {
    return Object.assign({}, this, {
      groups: []
    });
  }
}

function mergePricingTables(computed, override) {
  // TODO - partially merge them together? Right now override has to be an
  // entire copy of the table.
  return override || computed;
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
  // enabledServices: { [serviceId: ServiceId]: boolean }

  constructor(design) {
    this.design = design;
  }

  _getDyePrice({ selectedOption }) {
    requireValues({ selectedOption });

    if (!hasDye(selectedOption)) { return ZERO_SERVICE_PRICE; }

    const { unitsRequiredPerGarment } = selectedOption;
    const price = this._getFinalServicePrice('DYE', 'METER');

    return multiplyServicePriceByUnits(price, unitsRequiredPerGarment);
  }

  _getWashPrice({ selectedOption }) {
    requireValues({ selectedOption });

    if (!hasWash(selectedOption)) { return ZERO_SERVICE_PRICE; }

    const { unitsRequiredPerGarment } = selectedOption;
    const price = this._getFinalServicePrice('WASH', 'METER');

    return multiplyServicePriceByUnits(price, unitsRequiredPerGarment);
  }

  // Get the cost to do a feature placement (image print / embroidery) on each
  // garment. Either a fixed cost (stuff like screenprinting) or a per-yard cost
  // multiplied by the number of yards required (stuff like roll prints).
  _getFeaturePlacementPrice({ featurePlacement }) {
    requireValues({ featurePlacement });

    if (!featurePlacement.processName) {
      throw new MissingPrerequisitesError('Artwork is missing application type');
    }

    // TODO — Figure out the real source of truth for this number.
    // We don't seem to store this anywhere right now.
    const METERS_PER_GARMENT = 1;

    switch (featurePlacement.processName) {
      case 'DTG_ROLL': {
        const price = this._getFinalServicePrice('DTG_ROLL_PRINT');

        return multiplyServicePriceByUnits(price, METERS_PER_GARMENT);
      }
      case 'DTG_ENGINEERED':
        return this._getFinalServicePrice('DTG_ENGINEERED_PRINT', 'GARMENT');
      case 'DIGITAL_SUBLIMATION':
        return this._getFinalServicePrice('DIGITAL_SUBLIMATION_PRINT', 'GARMENT');
      case 'ROTARY_PRINT': {
        const price = this._getFinalServicePrice('ROTARY_PRINT');

        return multiplyServicePriceByUnits(price, METERS_PER_GARMENT);
      }
      case 'SCREEN_PRINT':
        return this._getFinalServicePrice('SCREEN_PRINT', 'GARMENT');
      case 'EMBROIDERY':
        return this._getFinalServicePrice('EMBROIDERY', 'GARMENT');

      default:
        throw new Error(`Unknown process name: ${featurePlacement.processName}`);
    }
  }

  /**
   * @param {ServiceId} serviceId
   * @param {ProductionPriceUnit} expectedUnit Will be validated against the
   * `priceUnit` of the matched bucket
   */
  _getFinalServicePrice(serviceId, expectedUnit) {
    const allowedServiceIds = Object.keys(SERVICE_IDS);

    if (allowedServiceIds.indexOf(serviceId) < 0) {
      throw new Error(`Price bucket requested for unknown service: ${serviceId}`);
    }

    const prices = this.pricesByService[serviceId];

    if (!this.enabledServices[serviceId]) {
      throw new MissingPrerequisitesError(`This garment requires a ${serviceId} service, but this service is not enabled or assigned to a partner`);
    }

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

    let basePriceBucket;

    try {
      basePriceBucket = getServiceBasePrice({
        productionPrices: prices,
        serviceId,
        unitsToProduce: this.unitsToProduce,
        complexityLevel: complexity
      });
    } catch (err) {
      if (err instanceof NoBucketError) {
        throw new MissingPrerequisitesError(`The partner's pricing table for ${serviceId} doesn't have any tier that matches the units/complexity of this design`);
      }

      throw err;
    }

    if (basePriceBucket.priceUnit !== expectedUnit) {
      throw new MissingPrerequisitesError(
        `${serviceId} service has pricing, but in the wrong units. ` +
        `Expected prices per ${expectedUnit}, got prices per ${basePriceBucket.priceUnit}.`
      );
    }

    const serviceMarginCents = getServiceMarginCents({
      serviceId,
      partnerPriceCents: basePriceBucket.priceCents,
      unitsToProduce: this.unitsToProduce
    });

    const setupMarginCents = getServiceSetupMarginCents({
      serviceId,
      partnerPriceCents: basePriceBucket.setupCostCents,
      unitsToProduce: this.unitsToProduce
    });

    return new ServicePrice({
      serviceCostCents: basePriceBucket.priceCents + serviceMarginCents,
      setupCostCents: basePriceBucket.setupCostCents + setupMarginCents,
      basePriceCents: basePriceBucket.priceCents,
      baseSetupCostCents: basePriceBucket.setupCostCents,
      serviceMarginCents,
      setupMarginCents
    });
  }

  async _fetchServicesAndPricing() {
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

  async _getComputedPricingTable() {
    const { design } = this;

    const { retailPriceCents } = design;

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

    const services = await this._fetchServicesAndPricing();

    const enabledServices = {};
    this.enabledServices = enabledServices;

    services.forEach((service) => { enabledServices[service.serviceId] = true; });

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

      lineItems: []
    });

    if (enabledServices.DESIGN) {
      const designPrice = this._getFinalServicePrice('DESIGN', 'DESIGN');

      developmentGroup.addLineItem(new LineItem({
        title: 'Design Consulting',
        id: 'development-design-consulting',
        quantity: 1,
        unitPriceCents: designPrice.serviceCostCents,
        unitMarginCents: designPrice.serviceMarginCents
      }));
    }

    if (enabledServices.PATTERN_MAKING) {
      const patternMakingPrice = this._getFinalServicePrice('PATTERN_MAKING', 'DESIGN');
      developmentGroup.addLineItem(new LineItem({
        title: 'Pattern Making',
        id: 'development-patternmaking',
        quantity: 1,
        unitPriceCents: patternMakingPrice.serviceCostCents,
        unitMarginCents: patternMakingPrice.serviceMarginCents
      }));
    }

    if (enabledServices.GRADING) {
      const gradingPrice = this._getFinalServicePrice('GRADING', 'SIZE');
      developmentGroup.addLineItem(new LineItem({
        title: 'Marking & Grading',
        id: 'development-grading',
        // We charge grading for (number of sizes - 1), since the sample size
        // doesn't need additional grading
        quantity: Math.max(numberOfSizes - 1, 0),
        unitPriceCents: gradingPrice.serviceCostCents,
        unitMarginCents: gradingPrice.serviceMarginCents
      }));
    }

    if (enabledServices.SOURCING) {
      const sourcingPrice = this._getFinalServicePrice('SOURCING', 'DESIGN');
      developmentGroup.addLineItem(new LineItem({
        title: 'Sourcing/Testing',
        id: 'development-sourcing',
        quantity: 1,
        unitPriceCents: sourcingPrice.serviceCostCents,
        unitMarginCents: sourcingPrice.serviceMarginCents
      }));
    }

    if (enabledServices.TECHNICAL_DESIGN) {
      const technicalDesignPrice = this._getFinalServicePrice('TECHNICAL_DESIGN', 'DESIGN');
      developmentGroup.addLineItem(new LineItem({
        title: 'Technical Design',
        id: 'development-technical-design',
        quantity: 1,
        unitPriceCents: technicalDesignPrice.serviceCostCents,
        unitMarginCents: technicalDesignPrice.serviceMarginCents
      }));
    }

    if (enabledServices.SAMPLING) {
      const samplingPrice = this._getFinalServicePrice('SAMPLING', 'DESIGN');
      developmentGroup.addLineItem(new LineItem({
        title: 'Sampling',
        id: 'development-sampling',
        quantity: 1,
        unitPriceCents: samplingPrice.serviceCostCents,
        unitMarginCents: samplingPrice.serviceMarginCents
      }));
    }

    selectedOptions.forEach((selectedOption) => {
      if (!enabledServices.SAMPLING) { return; }

      if (hasDye(selectedOption)) {
        const dyePrice = this._getDyePrice({ selectedOption });

        developmentGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricDyeProcessName} — Dye sample`,
          id: `${selectedOption.id}-dye-sample`,
          quantity: 1,
          unitPriceCents: dyePrice.setupCostCents + dyePrice.serviceCostCents,
          unitMarginCents: dyePrice.setupMarginCents + dyePrice.serviceMarginCents
        }));
      }

      if (hasWash(selectedOption)) {
        const washPrice = this._getWashPrice({ selectedOption });

        developmentGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricWashProcessName} — Wash sample`,
          id: `${selectedOption.id}-wash-sample`,
          quantity: 1,
          unitPriceCents: washPrice.setupCostCents + washPrice.serviceCostCents,
          unitMarginCents: washPrice.setupMarginCents + washPrice.serviceMarginCents
        }));
      }
    });

    featurePlacements.forEach((featurePlacement) => {
      if (!enabledServices.SAMPLING) { return; }

      const featurePrice = this._getFeaturePlacementPrice({ featurePlacement });

      const process = getFeatureFriendlyProcessName(featurePlacement);

      developmentGroup.addLineItem(new LineItem({
        title: `${process} (Sample)`,
        id: `${featurePlacement.id}-sample`,
        quantity: 1,
        unitPriceCents: featurePrice.setupCostCents + featurePrice.serviceCostCents,
        unitMarginCents: featurePrice.setupMarginCents + featurePrice.serviceMarginCents
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
        unitPriceCents: getOptionPerUnitCostCents({ option, selectedOption }),
        unitMarginCents: 0
      }));

      if (hasDye(selectedOption)) {
        const dyePrice = this._getDyePrice({ selectedOption });

        materialsGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricDyeProcessName} — Dye`,
          id: `${selectedOption.id}-dye`,
          quantity: 1,
          unitPriceCents: dyePrice.serviceCostCents,
          unitMarginCents: dyePrice.serviceMarginCents
        }));
      }

      if (hasWash(selectedOption)) {
        const washPrice = this._getWashPrice({ selectedOption });

        materialsGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricWashProcessName} — Wash`,
          id: `${selectedOption.id}-wash`,
          quantity: 1,
          unitPriceCents: washPrice.serviceCostCents,
          unitMarginCents: washPrice.serviceMarginCents
        }));
      }
    });

    featurePlacements.forEach((featurePlacement) => {
      const featurePrice = this._getFeaturePlacementPrice({ featurePlacement });

      const process = getFeatureFriendlyProcessName(featurePlacement);

      materialsGroup.addLineItem(new LineItem({
        title: process,
        id: `${featurePlacement.id}-print`,
        quantity: 1,
        unitPriceCents: featurePrice.serviceCostCents,
        unitMarginCents: featurePrice.serviceMarginCents
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

      lineItems: []
    });

    if (enabledServices.PRODUCTION) {
      const productionPrice = this._getFinalServicePrice('PRODUCTION', 'GARMENT');

      productionGroup.addLineItem(new LineItem({
        title: 'Cut, Sew, Trim',
        id: 'production-cut-sew',
        quantity: this.unitsToProduce,
        unitPriceCents: productionPrice.serviceCostCents,
        unitMarginCents: productionPrice.serviceMarginCents
      }));

      productionGroup.addLineItem(new LineItem({
        title: 'Materials',
        id: 'production-materials',
        quantity: this.unitsToProduce,
        unitPriceCents: materialsGroup.getTotalPriceCents(),
        unitMarginCents: materialsGroup.getTotalMarginCents()
      }));
    }

    selectedOptions.forEach((selectedOption) => {
      if (!enabledServices.PRODUCTION) { return; }

      const { option } = selectedOption;

      productionGroup.addLineItem(new LineItem({
        title: `${option.title} — Setup`,
        id: `${selectedOption.id}-setup`,
        quantity: 1,
        unitPriceCents: getOptionSetupCostCents({ option, selectedOption }),
        unitMarginCents: 0
      }));

      if (hasDye(selectedOption)) {
        const dyePrice = this._getDyePrice({ selectedOption });

        productionGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricDyeProcessName} — Setup`,
          id: `${selectedOption.id}-dye-setup`,
          quantity: 1,
          unitPriceCents: dyePrice.setupCostCents,
          unitMarginCents: dyePrice.setupMarginCents
        }));
      }

      if (hasWash(selectedOption)) {
        const washPrice = this._getWashPrice({ selectedOption });

        productionGroup.addLineItem(new LineItem({
          title: `${selectedOption.fabricWashProcessName} — Setup`,
          id: `${selectedOption.id}-wash-setup`,
          quantity: 1,
          unitPriceCents: washPrice.setupCostCents,
          unitMarginCents: washPrice.setupMarginCents
        }));
      }
    });

    featurePlacements.forEach((featurePlacement) => {
      if (!enabledServices.PRODUCTION) { return; }

      const featurePrice = this._getFeaturePlacementPrice({ featurePlacement });

      const process = getFeatureFriendlyProcessName(featurePlacement);

      productionGroup.addLineItem(new LineItem({
        title: `${process} — Setup`,
        id: `${featurePlacement.id}-setup`,
        quantity: 1,
        unitPriceCents: featurePrice.setupCostCents,
        unitMarginCents: featurePrice.setupMarginCents
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

      lineItems: []
    });

    if (enabledServices.FULFILLMENT) {
      const fulfillmentPrice = this._getFinalServicePrice('FULFILLMENT', 'GARMENT');

      fulfillmentGroup.addLineItem(new LineItem({
        title: 'Fulfillment',
        id: 'fulfillment',
        quantity: this.unitsToProduce,
        unitPriceCents: fulfillmentPrice.serviceCostCents,
        unitMarginCents: fulfillmentPrice.serviceMarginCents
      }));
    }

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

    const designerProfitGroup = new DesignerProfitGroup({
      title: 'Gross Profit per garment',
      unitProfitCents,
      totalProfitCents,
      marginPercentage
    });

    const portionCost = Math.round(productionGroup.getTotalPriceCents() / 2);
    const portionMargin = Math.round(productionGroup.getTotalMarginCents() / 2);

    const summary = new Summary({
      upfrontCostCents: developmentGroup.getTotalPriceCents(),
      preProductionCostCents: portionCost,
      uponCompletionCostCents: portionCost,
      fulfillmentCostCents: fulfillmentGroup.getTotalPriceCents(),

      upfrontMarginCents: developmentGroup.getTotalMarginCents(),
      preProductionMarginCents: portionMargin,
      uponCompletionMarginCents: portionMargin,
      fulfillmentMarginCents: fulfillmentGroup.getTotalMarginCents()
    });

    const groups = [
      developmentGroup,
      materialsGroup,
      productionGroup,
      fulfillmentGroup
    ];

    return new Table({
      groups,
      profit: designerProfitGroup,
      summary
    });
  }

  _getFinalPricingTable(computedPricingTable) {
    const override = this.design.overridePricingTable;
    const merged = mergePricingTables(computedPricingTable, override);

    return merged;
  }

  async getAllPricingTables() {
    const computedPricingTable = await this._getComputedPricingTable();
    const finalPricingTable = this._getFinalPricingTable(computedPricingTable);
    const overridePricingTable = this.design.overridePricingTable;

    return {
      computedPricingTable,
      finalPricingTable,
      overridePricingTable
    };
  }
}

module.exports = PricingCalculator;
