'use strict';

const pricing = {
  // Per complexity bucket, the cost to do custom pattern-making
  // i.e. from a user-uploaded sketch not a CALA template
  CUSTOM_PATTERN_MAKING_COSTS_CENTS: {
    0: 130 * 100,
    1: 260 * 100,
    2: 520 * 100,
    3: 650 * 100,
    4: 975 * 100
  },

  // The cost to modify our template patterns
  TEMPLATE_PATTERN_MAKING_COSTS_CENTS: 0,

  BUILTIN_FABRIC_SOURCING_COST_CENTS: 0,

  // The cost to source custom materials
  // Based on the Sourcing Complexity of the garment
  CUSTOM_SOURCING_COSTS_CENTS: {
    0: 0,
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

  // Based on the number of units they're doing AND the complexity
  CUT_AND_SEW_COST_CENTS: [
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

    { minUnits: 25, complexity: 3, cost: 91.5 * 100 },
    { minUnits: 50, complexity: 3, cost: 83.5 * 100 },
    { minUnits: 100, complexity: 3, cost: 74 * 100 },

    { minUnits: 25, complexity: 4, cost: 165 * 100 }
  ],


  //
  // Washes, dyes, and prints
  //

  WASH_SETUP_COST_CENTS: 40 * 100,
  WASH_PER_GARMENT_COST_CENTS: 4 * 100,

  DYE_SETUP_COST_CENTS: 100 * 100,
  DYE_PER_YARD_COST_CENTS: 75,

  DTG_PRINT_SETUP_COST_CENTS: 200 * 100,
  DTG_PRINT_PER_YARD_COST_CENTS: 10 * 100,

  SCREEN_PRINT_SETUP_COST_CENTS: 175 * 100,
  SCREEN_PRINT_PER_GARMENT_COST_CENTS: 1 * 100,

  ROTARY_PRINT_SETUP_COST_CENTS: 250 * 100,
  ROTARY_PRINT_PER_YARD_COST_CENTS: 125,

  EMBROIDERY_SETUP_COST_CENTS: 50,
  EMBROIDERY_COSTS_CENTS: {
    15000: 11 * 100, // 15000 stitches
    30000: 21 * 100,
    60000: 42 * 100
  },


  //
  // Fulfillment
  //
  PACKAGING_PER_GARMENT_COST_CENTS: 2 * 100,
  SHIPPING_PER_GARMENT_COST_CENTS: 10 * 100
};

module.exports = pricing;
