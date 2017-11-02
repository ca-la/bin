'use strict';

const pricing = {
  // Per patternComplexity bucket, the cost to do custom pattern-making
  // Complexity 0 represents the cost to modify a pre-made CALA pattern
  PATTERN_MAKING_COST_CENTS: {
    0: 130 * 100,
    1: 260 * 100,
    2: 520 * 100,
    3: 650 * 100,
    4: 975 * 100
  },

  BUILTIN_FABRIC_SOURCING_COST_CENTS: 0,

  // The cost to source custom materials
  // Based on the Sourcing Complexity of the garment
  // Complexity 0 represents the cost for a pre-made CALA pattern
  SOURCING_COST_CENTS: {
    0: 1,
    1: 110 * 100,
    2: 275 * 100,
    3: 550 * 100,
    4: 550 * 100
  },

  // Fixed price for the sample materials
  SAMPLE_YARDAGE_AND_TRIMS_COST_CENTS: 100 * 100,

  // Based on the Pattern Complexity of the garment
  SAMPLE_CUT_AND_SEW_COST_CENTS: {
    0: 75 * 100,
    1: 150 * 100,
    2: 275 * 100,
    3: 400 * 100,
    4: 650 * 100
  },

  // Based on the number of units they're doing AND the patternComplexity
  PRODUCTION_CUT_AND_SEW_COST_CENTS: [
    { minUnits: 0, complexity: 0, cost: 60 * 100 },
    { minUnits: 25, complexity: 0, cost: 35 * 100 },
    { minUnits: 50, complexity: 0, cost: 21 * 100 },

    { minUnits: 0, complexity: 1, cost: 120 * 100 },
    { minUnits: 25, complexity: 1, cost: 38 * 100 },
    { minUnits: 50, complexity: 1, cost: 29.5 * 100 },
    { minUnits: 100, complexity: 1, cost: 22.5 * 100 },

    { minUnits: 0, complexity: 2, cost: 220 * 100 },
    { minUnits: 25, complexity: 2, cost: 58 * 100 },
    { minUnits: 50, complexity: 2, cost: 53 * 100 },
    { minUnits: 100, complexity: 2, cost: 46 * 100 },

    { minUnits: 0, complexity: 3, cost: 91.5 * 100 },
    { minUnits: 25, complexity: 3, cost: 91.5 * 100 },
    { minUnits: 50, complexity: 3, cost: 83.5 * 100 },
    { minUnits: 100, complexity: 3, cost: 74 * 100 },

    { minUnits: 0, complexity: 4, cost: 165 * 100 },
    { minUnits: 25, complexity: 4, cost: 165 * 100 }
  ],


  //
  // Washes, dyes, and prints
  //

  WASH_SETUP_COST_CENTS: 40 * 100,
  WASH_PER_GARMENT_COST_CENTS: 4 * 100,

  DYE_SETUP_COST_CENTS: 100 * 100,
  DYE_PER_YARD_COST_CENTS: 75,

  FEATURE_SETUP_COST_CENTS: {
    DTG_ROLL: 100 * 100,
    DTG_ENGINEERED: 200 * 100,
    DIGITAL_SUBLIMATION: 100 * 100,
    ROTARY_PRINT: 250 * 100,
    SCREEN_PRINT: 175 * 100,
    EMBROIDERY: 50 * 100
  },

  FEATURE_PER_YARD_COST_CENTS: {
    DTG_ROLL: 8 * 100,
    DIGITAL_SUBLIMATION: 8 * 100,
    DTG_ENGINEERED: 10 * 100,
    ROTARY_PRINT: 125
  },

  SCREEN_PRINT_PER_GARMENT_COST_CENTS: 1 * 100,

  EMBROIDERY_COST_CENTS: {
    0: 11 * 100, // 15000 stitches
    1: 21 * 100, // 30000 stitches
    2: 42 * 100  // 60000 stitches
  },


  //
  // Fulfillment
  //
  PACKAGING_PER_GARMENT_COST_CENTS: 2 * 100,
  SHIPPING_PER_GARMENT_COST_CENTS: 10 * 100
};

module.exports = pricing;
