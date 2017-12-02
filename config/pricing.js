'use strict';

const pricing = {
  // Per patternComplexity bucket, the cost to do custom pattern-making
  // Complexity 0 represents the cost to modify a pre-made CALA pattern
  PATTERN_MAKING_COST_CENTS: {
    0: 0 * 100,
    1: 30 * 100,
    2: 60 * 100,
    3: 110 * 100,
    4: 170 * 100,
    5: 280 * 100,
    6: 440 * 100,
    7: 670 * 100,
    8: 780 * 100,
    9: 890 * 100,
    10: 1110 * 100
  },

  BUILTIN_FABRIC_SOURCING_COST_CENTS: 0,

  // The cost to source custom materials
  // Based on the Sourcing Complexity of the garment
  // Complexity 0 represents the cost for a pre-made CALA pattern
  SOURCING_COST_CENTS: {
    0: 0,
    1: 60 * 100,
    2: 110 * 100,
    3: 170 * 100,
    4: 220 * 100,
    5: 280 * 100,
    6: 560 * 100
  },

  // Fixed price for the sample materials
  SAMPLE_YARDAGE_AND_TRIMS_COST_CENTS: 0,

  // Based on the Pattern Complexity of the garment
  SAMPLE_CUT_AND_SEW_COST_CENTS: {
    0: 0 * 100,
    1: 36 * 100,
    2: 72 * 100,
    3: 108 * 100,
    4: 181 * 100,
    5: 289 * 100,
    6: 361 * 100,
    7: 433 * 100,
    8: 578 * 100,
    9: 722 * 100,
    10: 1750 * 100
  },

  // Based on the number of units they're doing AND the patternComplexity
  PRODUCTION_CUT_AND_SEW_COST_CENTS: [
    { minUnits: 0, complexity: 0, cost: 0 * 100 },
    { minUnits: 5, complexity: 0, cost: 0 * 100 },
    { minUnits: 15, complexity: 0, cost: 0 * 100 },
    { minUnits: 25, complexity: 0, cost: 0 * 100 },
    { minUnits: 50, complexity: 0, cost: 0 * 100 },
    { minUnits: 75, complexity: 0, cost: 0 * 100 },
    { minUnits: 100, complexity: 0, cost: 0 * 100 },
    { minUnits: 150, complexity: 0, cost: 0 * 100 },
    { minUnits: 200, complexity: 0, cost: 0 * 100 },
    { minUnits: 250, complexity: 0, cost: 0 * 100 },
    { minUnits: 300, complexity: 0, cost: 0 * 100 },
    { minUnits: 500, complexity: 0, cost: 0 * 100 },

    { minUnits: 0, complexity: 1, cost: 23 * 100 },
    { minUnits: 5, complexity: 1, cost: 21 * 100 },
    { minUnits: 15, complexity: 1, cost: 20 * 100 },
    { minUnits: 25, complexity: 1, cost: 18 * 100 },
    { minUnits: 50, complexity: 1, cost: 17 * 100 },
    { minUnits: 75, complexity: 1, cost: 14 * 100 },
    { minUnits: 100, complexity: 1, cost: 12.5 * 100 },
    { minUnits: 150, complexity: 1, cost: 12 * 100 },
    { minUnits: 200, complexity: 1, cost: 11 * 100 },
    { minUnits: 250, complexity: 1, cost: 9 * 100 },
    { minUnits: 300, complexity: 1, cost: 8 * 100 },
    { minUnits: 500, complexity: 1, cost: 7 * 100 },

    { minUnits: 0, complexity: 2, cost: 45 * 100 },
    { minUnits: 5, complexity: 2, cost: 38 * 100 },
    { minUnits: 15, complexity: 2, cost: 35 * 100 },
    { minUnits: 25, complexity: 2, cost: 31 * 100 },
    { minUnits: 50, complexity: 2, cost: 29 * 100 },
    { minUnits: 75, complexity: 2, cost: 26 * 100 },
    { minUnits: 100, complexity: 2, cost: 25 * 100 },
    { minUnits: 150, complexity: 2, cost: 23 * 100 },
    { minUnits: 200, complexity: 2, cost: 18 * 100 },
    { minUnits: 250, complexity: 2, cost: 16 * 100 },
    { minUnits: 300, complexity: 2, cost: 15 * 100 },
    { minUnits: 500, complexity: 2, cost: 11 * 100 },

    { minUnits: 0, complexity: 3, cost: 67 * 100 },
    { minUnits: 5, complexity: 3, cost: 54 * 100 },
    { minUnits: 15, complexity: 3, cost: 49 * 100 },
    { minUnits: 25, complexity: 3, cost: 46 * 100 },
    { minUnits: 50, complexity: 3, cost: 43 * 100 },
    { minUnits: 75, complexity: 3, cost: 41 * 100 },
    { minUnits: 100, complexity: 3, cost: 38 * 100 },
    { minUnits: 150, complexity: 3, cost: 34 * 100 },
    { minUnits: 200, complexity: 3, cost: 32 * 100 },
    { minUnits: 250, complexity: 3, cost: 27 * 100 },
    { minUnits: 300, complexity: 3, cost: 23 * 100 },
    { minUnits: 500, complexity: 3, cost: 15 * 100 },

    { minUnits: 0, complexity: 4, cost: 89 * 100 },
    { minUnits: 5, complexity: 4, cost: 72 * 100 },
    { minUnits: 15, complexity: 4, cost: 67 * 100 },
    { minUnits: 25, complexity: 4, cost: 64 * 100 },
    { minUnits: 50, complexity: 4, cost: 61 * 100 },
    { minUnits: 75, complexity: 4, cost: 58 * 100 },
    { minUnits: 100, complexity: 4, cost: 56 * 100 },
    { minUnits: 150, complexity: 4, cost: 48 * 100 },
    { minUnits: 200, complexity: 4, cost: 44 * 100 },
    { minUnits: 250, complexity: 4, cost: 40 * 100 },
    { minUnits: 300, complexity: 4, cost: 36 * 100 },
    { minUnits: 500, complexity: 4, cost: 21 * 100 },

    { minUnits: 0, complexity: 5, cost: 111 * 100 },
    { minUnits: 5, complexity: 5, cost: 89 * 100 },
    { minUnits: 15, complexity: 5, cost: 85 * 100 },
    { minUnits: 25, complexity: 5, cost: 82 * 100 },
    { minUnits: 50, complexity: 5, cost: 78 * 100 },
    { minUnits: 75, complexity: 5, cost: 75 * 100 },
    { minUnits: 100, complexity: 5, cost: 73 * 100 },
    { minUnits: 150, complexity: 5, cost: 62 * 100 },
    { minUnits: 200, complexity: 5, cost: 55 * 100 },
    { minUnits: 250, complexity: 5, cost: 52 * 100 },
    { minUnits: 300, complexity: 5, cost: 49 * 100 },
    { minUnits: 500, complexity: 5, cost: 26 * 100 },

    { minUnits: 0, complexity: 6, cost: 178 * 100 },
    { minUnits: 5, complexity: 6, cost: 131 * 100 },
    { minUnits: 15, complexity: 6, cost: 122 * 100 },
    { minUnits: 25, complexity: 6, cost: 118 * 100 },
    { minUnits: 50, complexity: 6, cost: 115 * 100 },
    { minUnits: 75, complexity: 6, cost: 111 * 100 },
    { minUnits: 100, complexity: 6, cost: 108 * 100 },
    { minUnits: 150, complexity: 6, cost: 90 * 100 },
    { minUnits: 200, complexity: 6, cost: 85 * 100 },
    { minUnits: 250, complexity: 6, cost: 80 * 100 },
    { minUnits: 300, complexity: 6, cost: 77 * 100 },
    { minUnits: 500, complexity: 6, cost: 42 * 100 },

    { minUnits: 0, complexity: 7, cost: 223 * 100 },
    { minUnits: 5, complexity: 7, cost: 208 * 100 },
    { minUnits: 15, complexity: 7, cost: 192 * 100 },
    { minUnits: 25, complexity: 7, cost: 177 * 100 },
    { minUnits: 50, complexity: 7, cost: 172 * 100 },
    { minUnits: 75, complexity: 7, cost: 171 * 100 },
    { minUnits: 100, complexity: 7, cost: 169 * 100 },
    { minUnits: 150, complexity: 7, cost: 138 * 100 },
    { minUnits: 200, complexity: 7, cost: 137 * 100 },
    { minUnits: 250, complexity: 7, cost: 134 * 100 },
    { minUnits: 300, complexity: 7, cost: 131 * 100 },
    { minUnits: 500, complexity: 7, cost: 75 * 100 },

    { minUnits: 0, complexity: 8, cost: 267 * 100 },
    { minUnits: 5, complexity: 8, cost: 262 * 100 },
    { minUnits: 15, complexity: 8, cost: 254 * 100 },
    { minUnits: 25, complexity: 8, cost: 240 * 100 },
    { minUnits: 50, complexity: 8, cost: 237 * 100 },
    { minUnits: 75, complexity: 8, cost: 234 * 100 },
    { minUnits: 100, complexity: 8, cost: 231 * 100 },
    { minUnits: 150, complexity: 8, cost: 195 * 100 },
    { minUnits: 200, complexity: 8, cost: 189 * 100 },
    { minUnits: 250, complexity: 8, cost: 188 * 100 },
    { minUnits: 300, complexity: 8, cost: 185 * 100 },
    { minUnits: 500, complexity: 8, cost: 111 * 100 },

    { minUnits: 0, complexity: 9, cost: 356 * 100 },
    { minUnits: 5, complexity: 9, cost: 305 * 100 },
    { minUnits: 15, complexity: 9, cost: 300 * 100 },
    { minUnits: 25, complexity: 9, cost: 298 * 100 },
    { minUnits: 50, complexity: 9, cost: 295 * 100 },
    { minUnits: 75, complexity: 9, cost: 292 * 100 },
    { minUnits: 100, complexity: 9, cost: 288 * 100 },
    { minUnits: 150, complexity: 9, cost: 222 * 100 },
    { minUnits: 200, complexity: 9, cost: 218 * 100 },
    { minUnits: 250, complexity: 9, cost: 212 * 100 },
    { minUnits: 300, complexity: 9, cost: 208 * 100 },
    { minUnits: 500, complexity: 9, cost: 132 * 100 },

    { minUnits: 0, complexity: 10, cost: 445 * 100 },
    { minUnits: 5, complexity: 10, cost: 369 * 100 },
    { minUnits: 15, complexity: 10, cost: 366 * 100 },
    { minUnits: 25, complexity: 10, cost: 361 * 100 },
    { minUnits: 50, complexity: 10, cost: 352 * 100 },
    { minUnits: 75, complexity: 10, cost: 349 * 100 },
    { minUnits: 100, complexity: 10, cost: 346 * 100 },
    { minUnits: 150, complexity: 10, cost: 238 * 100 },
    { minUnits: 200, complexity: 10, cost: 235 * 100 },
    { minUnits: 250, complexity: 10, cost: 234 * 100 },
    { minUnits: 300, complexity: 10, cost: 231 * 100 },
    { minUnits: 500, complexity: 10, cost: 154 * 100 },

    { minUnits: 0, complexity: 11, cost: 1077 * 100 },
    { minUnits: 5, complexity: 11, cost: 577 * 100 },
    { minUnits: 15, complexity: 11, cost: 498 * 100 },
    { minUnits: 25, complexity: 11, cost: 492 * 100 },
    { minUnits: 50, complexity: 11, cost: 485 * 100 },
    { minUnits: 75, complexity: 11, cost: 469 * 100 },
    { minUnits: 100, complexity: 11, cost: 462 * 100 },
    { minUnits: 150, complexity: 11, cost: 338 * 100 },
    { minUnits: 200, complexity: 11, cost: 323 * 100 },
    { minUnits: 250, complexity: 11, cost: 315 * 100 },
    { minUnits: 300, complexity: 11, cost: 308 * 100 },
    { minUnits: 500, complexity: 11, cost: 231 * 100 }
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
    0: 6 * 100, // 15000 stitches
    1: 12 * 100, // 30000 stitches
    2: 24 * 100  // 60000 stitches
  },


  //
  // Fulfillment
  //
  PACKAGING_PER_GARMENT_COST_CENTS: 2 * 100,
  SHIPPING_PER_GARMENT_COST_CENTS: 10 * 100
};

module.exports = pricing;
