'use strict';

const pricing = {
  // Per patternComplexity bucket, the cost to do custom pattern-making
  // Complexity 0 represents the cost to modify a pre-made CALA pattern
  PATTERN_MAKING_COST_CENTS: {
    0: 50 * 100,
    1: 150 * 100,
    2: 250 * 100,
    3: 350 * 100,
    4: 500 * 100
  },

  BUILTIN_FABRIC_SOURCING_COST_CENTS: 0,

  // The cost to source custom materials
  // Based on the Sourcing Complexity of the garment
  // Complexity 0 represents the cost for a pre-made CALA pattern
  SOURCING_COST_CENTS: {
    0: 1,
    1: 110 * 100,
    2: 275 * 100,
    3: 350 * 100,
    4: 550 * 100
  },

  // Fixed price for the sample materials
  SAMPLE_YARDAGE_AND_TRIMS_COST_CENTS: 50 * 100,

  // Based on the Pattern Complexity of the garment
  SAMPLE_CUT_AND_SEW_COST_CENTS: {
    0: 86 * 100,
    1: 132 * 100,
    2: 266 * 100,
    3: 360 * 100,
    4: 630 * 100
  },

  // Based on the number of units they're doing AND the productionComplexity
  PRODUCTION_CUT_AND_SEW_COST_CENTS: [
    { minUnits: 0, complexity: 0, cost: 86 * 100 },
    { minUnits: 5, complexity: 0, cost: 78 * 100 },
    { minUnits: 15, complexity: 0, cost: 70 * 100 },
    { minUnits: 25, complexity: 0, cost: 58 * 100 },
    { minUnits: 50, complexity: 0, cost: 50 * 100 },
    { minUnits: 75, complexity: 0, cost: 45 * 100 },
    { minUnits: 100, complexity: 0, cost: 35 * 100 },
    { minUnits: 150, complexity: 0, cost: 30 * 100 },
    { minUnits: 200, complexity: 0, cost: 25 * 100 },
    { minUnits: 250, complexity: 0, cost: 22 * 100 },
    { minUnits: 300, complexity: 0, cost: 19 * 100 },
    { minUnits: 500, complexity: 0, cost: 16 * 100 },

    { minUnits: 0, complexity: 1, cost: 132 * 100 },
    { minUnits: 5, complexity: 1, cost: 120 * 100 },
    { minUnits: 15, complexity: 1, cost: 108 * 100 },
    { minUnits: 25, complexity: 1, cost: 89 * 100 },
    { minUnits: 50, complexity: 1, cost: 77 * 100 },
    { minUnits: 75, complexity: 1, cost: 69 * 100 },
    { minUnits: 100, complexity: 1, cost: 54 * 100 },
    { minUnits: 150, complexity: 1, cost: 47 * 100 },
    { minUnits: 200, complexity: 1, cost: 39 * 100 },
    { minUnits: 250, complexity: 1, cost: 33 * 100 },
    { minUnits: 300, complexity: 1, cost: 29 * 100 },
    { minUnits: 500, complexity: 1, cost: 25 * 100 },

    { minUnits: 0, complexity: 2, cost: 266 * 100 },
    { minUnits: 5, complexity: 2, cost: 241 * 100 },
    { minUnits: 15, complexity: 2, cost: 217 * 100 },
    { minUnits: 25, complexity: 2, cost: 179 * 100 },
    { minUnits: 50, complexity: 2, cost: 156 * 100 },
    { minUnits: 75, complexity: 2, cost: 138 * 100 },
    { minUnits: 100, complexity: 2, cost: 110 * 100 },
    { minUnits: 150, complexity: 2, cost: 94 * 100 },
    { minUnits: 200, complexity: 2, cost: 78 * 100 },
    { minUnits: 250, complexity: 2, cost: 67 * 100 },
    { minUnits: 300, complexity: 2, cost: 59 * 100 },
    { minUnits: 500, complexity: 2, cost: 50 * 100 },

    { minUnits: 0, complexity: 3, cost: 396 * 100 },
    { minUnits: 5, complexity: 3, cost: 359 * 100 },
    { minUnits: 15, complexity: 3, cost: 323 * 100 },
    { minUnits: 25, complexity: 3, cost: 267 * 100 },
    { minUnits: 50, complexity: 3, cost: 232 * 100 },
    { minUnits: 75, complexity: 3, cost: 206 * 100 },
    { minUnits: 100, complexity: 3, cost: 163 * 100 },
    { minUnits: 150, complexity: 3, cost: 140 * 100 },
    { minUnits: 200, complexity: 3, cost: 116 * 100 },
    { minUnits: 250, complexity: 3, cost: 100 * 100 },
    { minUnits: 300, complexity: 3, cost: 87 * 100 },
    { minUnits: 500, complexity: 3, cost: 74 * 100 },

    { minUnits: 0, complexity: 4, cost: 630 * 100 },
    { minUnits: 5, complexity: 4, cost: 571 * 100 },
    { minUnits: 15, complexity: 4, cost: 514 * 100 },
    { minUnits: 25, complexity: 4, cost: 424 * 100 },
    { minUnits: 50, complexity: 4, cost: 369 * 100 },
    { minUnits: 75, complexity: 4, cost: 327 * 100 },
    { minUnits: 100, complexity: 4, cost: 260 * 100 },
    { minUnits: 150, complexity: 4, cost: 222 * 100 },
    { minUnits: 200, complexity: 4, cost: 184 * 100 },
    { minUnits: 250, complexity: 4, cost: 160 * 100 },
    { minUnits: 300, complexity: 4, cost: 139 * 100 },
    { minUnits: 500, complexity: 4, cost: 118 * 100 }
  ],


  //
  // Washes, dyes, and prints
  //

  WASH_SETUP_COST_CENTS: 40 * 100,
  WASH_PER_GARMENT_COST_CENTS: 3 * 100,

  DYE_SETUP_COST_CENTS: 35 * 100,
  DYE_PER_YARD_COST_CENTS: 60,

  FEATURE_SETUP_COST_CENTS: {
    DTG_ROLL: 100 * 100,
    DTG_ENGINEERED: 200 * 100,
    DIGITAL_SUBLIMATION: 100 * 100,
    ROTARY_PRINT: 250 * 100,
    SCREEN_PRINT: 130 * 100,
    EMBROIDERY: 50 * 100
  },

  FEATURE_PER_YARD_COST_CENTS: {
    DTG_ROLL: 8 * 100,
    DIGITAL_SUBLIMATION: 8 * 100,
    DTG_ENGINEERED: 10 * 100,
    ROTARY_PRINT: 1.25 * 100
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
