import DataAdapter from '../../../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';
import Asset, {
  AssetRow,
  toData as encodeAsset,
  toInsertion as decodeAsset
} from '../../../assets/domain-object';
import ImageAttribute, {
  decode as decodeImage,
  encode as encodeImage,
  ImageAttributeRow,
  isImageAttribute,
  isImageAttributeRow
} from './index';

export default interface ImageAttributeWithAsset extends ImageAttribute {
  asset: Asset;
}

export interface ImageAttributeWithAssetRow extends ImageAttributeRow {
  asset: AssetRow;
}

function encode(row: ImageAttributeWithAssetRow): ImageAttributeWithAsset {
  const { asset, ...artwork } = row;

  return {
    ...encodeImage(artwork),
    asset: encodeAsset(asset)
  };
}

function decode(data: ImageAttributeWithAsset): ImageAttributeWithAssetRow {
  const { asset, ...artwork } = data;

  return {
    ...decodeImage(artwork),
    asset: decodeAsset(asset)
  };
}

export const dataAdapter = new DataAdapter<
  ImageAttributeWithAssetRow,
  ImageAttributeWithAsset
>(encode, decode);

export function isImageAttributeWithAsset(
  obj: object
): obj is ImageAttributeWithAsset {
  return isImageAttribute(obj) && hasProperties(obj, 'asset');
}

export function isImageAttributeWithAssetRow(
  row: object
): row is ImageAttributeWithAssetRow {
  return isImageAttributeRow(row) && hasProperties(row, 'asset');
}
