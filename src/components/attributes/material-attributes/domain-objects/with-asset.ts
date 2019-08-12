import DataAdapter from '../../../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';
import Asset, {
  AssetRow,
  toData as encodeAsset,
  toInsertion as decodeAsset
} from '../../../assets/domain-object';
import MaterialAttribute, {
  decode as decodeMaterial,
  encode as encodeMaterial,
  isMaterialAttribute,
  isMaterialAttributeRow,
  MaterialAttributeRow
} from './index';

export default interface MaterialAttributeWithAsset extends MaterialAttribute {
  asset: Asset;
}

export interface MaterialAttributeWithAssetRow extends MaterialAttributeRow {
  asset: AssetRow;
}

function encode(
  row: MaterialAttributeWithAssetRow
): MaterialAttributeWithAsset {
  const { asset, ...artwork } = row;

  return {
    ...encodeMaterial(artwork),
    asset: encodeAsset(asset)
  };
}

function decode(
  data: MaterialAttributeWithAsset
): MaterialAttributeWithAssetRow {
  const { asset, ...artwork } = data;

  return {
    ...decodeMaterial(artwork),
    asset: decodeAsset(asset)
  };
}

export const dataAdapter = new DataAdapter<
  MaterialAttributeWithAssetRow,
  MaterialAttributeWithAsset
>(encode, decode);

export function isMaterialAttributeWithAsset(
  obj: object
): obj is MaterialAttributeWithAsset {
  return isMaterialAttribute(obj) && hasProperties(obj, 'asset');
}

export function isMaterialAttributeWithAssetRow(
  row: object
): row is MaterialAttributeWithAssetRow {
  return isMaterialAttributeRow(row) && hasProperties(row, 'asset');
}
