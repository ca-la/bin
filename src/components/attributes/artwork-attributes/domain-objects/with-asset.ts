import DataAdapter from '../../../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';
import Asset, {
  AssetRow,
  toData as encodeAsset,
  toInsertion as decodeAsset
} from '../../../assets/domain-object';
import ArtworkAttribute, {
  ArtworkAttributeRow,
  decode as decodeArtwork,
  encode as encodeArtwork,
  isArtworkAttribute,
  isArtworkAttributeRow
} from './index';

export default interface ArtworkAttributeWithAsset extends ArtworkAttribute {
  asset: Asset;
}

export interface ArtworkAttributeWithAssetRow extends ArtworkAttributeRow {
  asset: AssetRow;
}

function encode(row: ArtworkAttributeWithAssetRow): ArtworkAttributeWithAsset {
  const { asset, ...artwork } = row;

  return {
    ...encodeArtwork(artwork),
    asset: encodeAsset(asset)
  };
}

function decode(data: ArtworkAttributeWithAsset): ArtworkAttributeWithAssetRow {
  const { asset, ...artwork } = data;

  return {
    ...decodeArtwork(artwork),
    asset: decodeAsset(asset)
  };
}

export const dataAdapter = new DataAdapter<
  ArtworkAttributeWithAssetRow,
  ArtworkAttributeWithAsset
>(encode, decode);

export function isArtworkAttributeWithAsset(
  obj: object
): obj is ArtworkAttributeWithAsset {
  return isArtworkAttribute(obj) && hasProperties(obj, 'asset');
}

export function isArtworkAttributeWithAssetRow(
  row: object
): row is ArtworkAttributeWithAssetRow {
  return isArtworkAttributeRow(row) && hasProperties(row, 'asset');
}
