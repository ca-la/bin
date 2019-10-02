import * as uuid from 'node-uuid';

import { NodeRow } from '../../components/nodes/domain-objects';
import { DimensionAttributeRow } from '../../components/attributes/dimension-attributes/domain-object';
import { EnrichedComponent } from '.';
import { getExtension } from '../../components/assets/services/get-extension';
import { ImageAttributeRow } from '../../components/attributes/image-attributes/domain-objects';
import { ACCEPTED_IMAGE_TYPES } from '@cala/ts-lib';

const VECTOR_FILE_TYPES = ['svg'];

interface Created {
  dimensionAttribute: DimensionAttributeRow;
  dimensionAttributeForRoot: DimensionAttributeRow;
  imageAttribute: ImageAttributeRow;
  node: NodeRow;
}

export default function portComponent(
  component: EnrichedComponent
): Created | null {
  const currentAsset =
    component.artwork_asset ||
    component.material_asset ||
    component.sketch_asset;

  if (!currentAsset) {
    throw new Error(`Component ${component.id} has no asset!`);
  }

  const assetExtension = getExtension(currentAsset.mime_type);

  if (!assetExtension) {
    throw new Error(
      `Unknown extension "${currentAsset.mime_type}" for Asset ${
        currentAsset.id
      }.`
    );
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(assetExtension)) {
    // TODO: determine how to handle non-image based Nodes.
    return null;
  }

  const isVector = assetExtension
    ? VECTOR_FILE_TYPES.includes(assetExtension)
    : false;

  const node: NodeRow = {
    id: component.id,
    created_at: component.created_at,
    created_by: component.created_by,
    deleted_at: null,
    parent_id: component.canvas_id,
    x: '0',
    y: '0',
    ordering: 0,
    title: null,
    // TODO: will need to consider non-previewable asset types as well.
    type: isVector ? 'VECTOR' : 'IMAGE'
  };

  const imageAttribute: ImageAttributeRow = {
    id: uuid.v4(),
    created_at: component.created_at,
    created_by: component.created_by,
    deleted_at: null,
    node_id: component.id,
    asset_id: currentAsset.id,
    x: '0',
    y: '0',
    width: currentAsset.original_width_px,
    height: currentAsset.original_height_px
  };
  const dimensionAttribute: DimensionAttributeRow = {
    id: uuid.v4(),
    created_at: component.created_at,
    created_by: component.created_by,
    deleted_at: null,
    node_id: component.id,
    width: currentAsset.original_width_px,
    height: currentAsset.original_height_px
  };
  // The "Frame" for the root node (AKA the ported canvas).
  const dimensionAttributeForRoot: DimensionAttributeRow = {
    id: uuid.v4(),
    created_at: component.created_at,
    created_by: component.created_by,
    deleted_at: null,
    node_id: component.canvas_id,
    width: currentAsset.original_width_px,
    height: currentAsset.original_height_px
  };

  return {
    dimensionAttribute,
    dimensionAttributeForRoot,
    imageAttribute,
    node
  };
}
