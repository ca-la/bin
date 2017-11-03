'use strict';

const pricing = {
  // Per patternComplexity bucket, the cost to do custom pattern-making
  // Complexity 0 represents the cost to modify a pre-made CALA pattern
  PATTERN_MAKING_COST_CENTS: {
    0: 75 * 100,
    1: 130 * 100,
    2: 260 * 100,
    3: 520 * 100,
    4: 650 * 100,
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
    3: 350 * 100,
    4: 550 * 100
  },

  // Fixed price for the sample materials
  SAMPLE_YARDAGE_AND_TRIMS_COST_CENTS: 100 * 100,

  // Based on the Pattern Complexity of the garment
  SAMPLE_CUT_AND_SEW_COST_CENTS: {
    0: 87.5 * 100,
    1: 175 * 100,
    2: 275 * 100,
    3: 400 * 100,
    4: 650 * 100
  },

  // Based on the number of units they're doing AND the patternComplexity
  PRODUCTION_CUT_AND_SEW_COST_CENTS: [
    { minUnits: 0, complexity: 0, cost: 87.5 * 100 },
    { minUnits: 5, complexity: 0, cost: 80 * 100 },
    { minUnits: 15, complexity: 0, cost: 70 * 100 },
    { minUnits: 25, complexity: 0, cost: 65 * 100 },
    { minUnits: 50, complexity: 0, cost: 58 * 100 },
    { minUnits: 75, complexity: 0, cost: 54 * 100 },
    { minUnits: 100, complexity: 0, cost: 50 * 100 },
    { minUnits: 150, complexity: 0, cost: 45 * 100 },
    { minUnits: 200, complexity: 0, cost: 38 * 100 },
    { minUnits: 250, complexity: 0, cost: 32 * 100 },
    { minUnits: 300, complexity: 0, cost: 25 * 100 },
    { minUnits: 500, complexity: 0, cost: 18 * 100 },

    { minUnits: 0, complexity: 1, cost: 175 * 100 },
    { minUnits: 5, complexity: 1, cost: 150 * 100 },
    { minUnits: 15, complexity: 1, cost: 130 * 100 },
    { minUnits: 25, complexity: 1, cost: 85 * 100 },
    { minUnits: 50, complexity: 1, cost: 75 * 100 },
    { minUnits: 75, complexity: 1, cost: 70 * 100 },
    { minUnits: 100, complexity: 1, cost: 62 * 100 },
    { minUnits: 150, complexity: 1, cost: 60 * 100 },
    { minUnits: 200, complexity: 1, cost: 55 * 100 },
    { minUnits: 250, complexity: 1, cost: 48 * 100 },
    { minUnits: 300, complexity: 1, cost: 44 * 100 },
    { minUnits: 500, complexity: 1, cost: 38 * 100 },

    { minUnits: 0, complexity: 2, cost: 275 * 100 },
    { minUnits: 5, complexity: 2, cost: 250 * 100 },
    { minUnits: 15, complexity: 2, cost: 230 * 100 },
    { minUnits: 25, complexity: 2, cost: 195 * 100 },
    { minUnits: 50, complexity: 2, cost: 170 * 100 },
    { minUnits: 75, complexity: 2, cost: 145 * 100 },
    { minUnits: 100, complexity: 2, cost: 110 * 100 },
    { minUnits: 150, complexity: 2, cost: 90 * 100 },
    { minUnits: 200, complexity: 2, cost: 73 * 100 },
    { minUnits: 250, complexity: 2, cost: 65 * 100 },
    { minUnits: 300, complexity: 2, cost: 59 * 100 },
    { minUnits: 500, complexity: 2, cost: 54 * 100 },

    { minUnits: 0, complexity: 3, cost: 400 * 100 },
    { minUnits: 5, complexity: 3, cost: 370 * 100 },
    { minUnits: 15, complexity: 3, cost: 340 * 100 },
    { minUnits: 25, complexity: 3, cost: 285 * 100 },
    { minUnits: 50, complexity: 3, cost: 245 * 100 },
    { minUnits: 75, complexity: 3, cost: 210 * 100 },
    { minUnits: 100, complexity: 3, cost: 147 * 100 },
    { minUnits: 150, complexity: 3, cost: 116 * 100 },
    { minUnits: 200, complexity: 3, cost: 89 * 100 },
    { minUnits: 250, complexity: 3, cost: 78 * 100 },
    { minUnits: 300, complexity: 3, cost: 70 * 100 },
    { minUnits: 500, complexity: 3, cost: 64 * 100 },

    { minUnits: 0, complexity: 4, cost: 650 * 100 },
    { minUnits: 5, complexity: 4, cost: 600 * 100 },
    { minUnits: 15, complexity: 4, cost: 553 * 100 },
    { minUnits: 25, complexity: 4, cost: 464 * 100 },
    { minUnits: 50, complexity: 4, cost: 397 * 100 },
    { minUnits: 75, complexity: 4, cost: 341 * 100 },
    { minUnits: 100, complexity: 4, cost: 239 * 100 },
    { minUnits: 150, complexity: 4, cost: 189 * 100 },
    { minUnits: 200, complexity: 4, cost: 145 * 100 },
    { minUnits: 250, complexity: 4, cost: 127 * 100 },
    { minUnits: 300, complexity: 4, cost: 114 * 100 },
    { minUnits: 500, complexity: 4, cost: 103 * 100 }
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
