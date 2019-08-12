import DataAdapter from '../../../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';
import Asset, {
  AssetRow,
  toData as encodeAsset,
  toInsertion as decodeAsset
} from '../../../assets/domain-object';
import SketchAttribute, {
  decode as decodeSketch,
  encode as encodeSketch,
  isSketchAttribute,
  isSketchAttributeRow,
  SketchAttributeRow
} from './index';

export default interface SketchAttributeWithAsset extends SketchAttribute {
  asset: Asset;
}

export interface SketchAttributeWithAssetRow extends SketchAttributeRow {
  asset: AssetRow;
}

function encode(row: SketchAttributeWithAssetRow): SketchAttributeWithAsset {
  const { asset, ...artwork } = row;

  return {
    ...encodeSketch(artwork),
    asset: encodeAsset(asset)
  };
}

function decode(data: SketchAttributeWithAsset): SketchAttributeWithAssetRow {
  const { asset, ...artwork } = data;

  return {
    ...decodeSketch(artwork),
    asset: decodeAsset(asset)
  };
}

export const dataAdapter = new DataAdapter<
  SketchAttributeWithAssetRow,
  SketchAttributeWithAsset
>(encode, decode);

export function isSketchAttributeWithAsset(
  obj: object
): obj is SketchAttributeWithAsset {
  return isSketchAttribute(obj) && hasProperties(obj, 'asset');
}

export function isSketchAttributeWithAssetRow(
  row: object
): row is SketchAttributeWithAssetRow {
  return isSketchAttributeRow(row) && hasProperties(row, 'asset');
}
