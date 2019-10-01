import * as Knex from 'knex';
import { NodeAttributes } from '../../../components/nodes/services/get-all-by-design';

import { findAllByNodes as findAllDimensions } from '../../../components/attributes/dimension-attributes/dao';
import { findAllByNodes as findAllMaterials } from '../../../components/attributes/material-attributes/dao';
import { findAllByNodes as findAllSketches } from '../../../components/attributes/sketch-attributes/dao';
import findAndDuplicateDimension from './dimension';
import findAndDuplicateMaterial from './material';
import findAndDuplicateSketch from './sketch';
import DimensionAttribute from '../../../components/attributes/dimension-attributes/domain-object';
import MaterialAttribute from '../../../components/attributes/material-attributes/domain-objects';
import SketchAttribute from '../../../components/attributes/sketch-attributes/domain-objects';
import { omit } from 'lodash';

/**
 * Duplicates all attributes related to the given node.
 */
export default async function findAndDuplicateAttributesForNode(options: {
  currentNodeId: string;
  newCreatorId: string;
  newNodeId: string;
  trx: Knex.Transaction;
}): Promise<NodeAttributes> {
  const { currentNodeId, newCreatorId, newNodeId, trx } = options;

  const dimensions = await findAllDimensions([currentNodeId], trx);
  const materials = await findAllMaterials([currentNodeId], trx);
  const sketches = await findAllSketches([currentNodeId], trx);

  const duplicateDimensions: DimensionAttribute[] = [];
  const duplicateMaterials: MaterialAttribute[] = [];
  const duplicateSketches: SketchAttribute[] = [];

  for (const dimension of dimensions) {
    const duplicateDimension = await findAndDuplicateDimension({
      currentDimension: dimension,
      currentDimensionId: dimension.id,
      newCreatorId,
      newNodeId,
      trx
    });
    duplicateDimensions.push(duplicateDimension);
  }

  for (const material of materials) {
    const duplicateMaterial = await findAndDuplicateMaterial({
      currentMaterial: omit(material, 'asset'),
      currentMaterialId: material.id,
      newCreatorId,
      newNodeId,
      trx
    });
    duplicateMaterials.push(duplicateMaterial);
  }

  for (const sketch of sketches) {
    const duplicateSketch = await findAndDuplicateSketch({
      currentSketch: omit(sketch, 'asset'),
      currentSketchId: sketch.id,
      newCreatorId,
      newNodeId,
      trx
    });
    duplicateSketches.push(duplicateSketch);
  }

  return {
    artworks: [],
    dimensions: duplicateDimensions,
    materials: duplicateMaterials,
    sketches: duplicateSketches
  };
}
