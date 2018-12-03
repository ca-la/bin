import { hasProperties } from '../services/require-properties';

export type Complexity = 'BLANK' | 'SIMPLE' | 'MEDIUM' | 'COMPLEX';

export type MaterialCategory = 'SPECIFY' | 'BASIC' | 'STANDARD' | 'LUXE' | 'ULTRA_LUXE';

export type Process =
  {
    name: 'SCREEN_PRINTING',
    complexity: '1_COLOR' |
      '2_COLORS' |
      '3_COLORS' |
      '4_COLORS' |
      '5_COLORS' |
      '6_COLORS' |
      '7_COLORS' |
      '8_COLORS' |
      '9_COLORS'
  } |
  {
    name: 'EMBROIDERY',
    complexity: 'SMALL' | 'MEDIUM' | 'LARGE'
  } |
  {
    name: 'WASH',
    complexity: Complexity
  } |
  {
    name: 'DYE',
    complexity: Complexity
  } |
  {
    name: 'DISTRESS',
    complexity: Complexity
  } |
  {
    name: 'EMBELLISH',
    complexity: Complexity
  };

export function isProcess(candidate: object): candidate is Process {
  return hasProperties(
    candidate,
    'name',
    'complexity'
  );
}

export type ProductType = 'BATHROBE' |
  'BLAZER' |
  'BLOUSE' |
  'COAT' |
  'DRESS' |
  'DRESS_SHIRT' |
  'HOODED_SWEATSHIRT' |
  'JACKET' |
  'LARGE_BAG' |
  'LONGSLEEVE_TEESHIRT' |
  'LONG_SKIRT' |
  'PANTS' |
  'PURSE' |
  'SHORTS' |
  'SHORTSLEEVE_DRESS SHIRT' |
  'SKIRT' |
  'SMALL_BAG' |
  'SPORT_COAT' |
  'SWEATER' |
  'SWEATSHIRT' |
  'TANK_TOP' |
  'TEESHIRT' |
  'TIE' |
  'UNDERWEAR' |
  'WALLET';
