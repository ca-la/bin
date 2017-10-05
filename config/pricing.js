const GARMENT_PATTERN_COMPLEXITIES = {
  verySimple: 'VERY_SIMPLE_PATTERN',
  simple: 'SIMPLE_PATTERN',
  moderate: 'MODERATE_PATTERN',
  complex: 'COMPLEX_PATTERN',
  extremelyComplex: 'EXTREMELY_COMPLEX_PATTERN'
};
const GPC = GARMENT_PATTERN_COMPLEXITIES;

const PATTERN_MAKING_COSTS_CENTS = {
  [GPC.verySimple]: 13000,
  [GPC.simple]: 26000,
  [GPC.moderate]: 52000,
  [GPC.complex]: 65000,
  [GPC.extremelyComplex]: 97500
};

const GARMENT_SOURCING_COMPLEXITIES = {
  verySimple: 'VERY_SIMPLE_SOURCING',
  simple: 'SIMPLE_SOURCING',
  moderate: 'MODERATE_SOURCING',
  complex: 'COMPLEX_SOURCING',
  extremelyComplex: 'EXTREMELY_COMPLEX_SOURCING'
};
const GSC = GARMENT_SOURCING_COMPLEXITIES;

const SOURCING_COSTS_CENTS = {
  [GSC.verySimple]: 0,
  [GSC.simple]: 11000,
  [GSC.moderate]: 27500,
  [GSC.complex]: 55000,
  [GSC.extremelyComplex]: // TODO ???
};
