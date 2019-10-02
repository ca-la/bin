import Node from '../domain-objects';
import MaterialAttribute from '../../attributes/material-attributes/domain-objects';
import ImageAttribute from '../../attributes/image-attributes/domain-objects';
import Asset from '../../assets/domain-object';
import MaterialAttributeWithAsset from '../../attributes/material-attributes/domain-objects/with-asset';
import ImageAttributeWithAsset from '../../attributes/image-attributes/domain-objects/with-asset';
import { findNodeTrees, findRootNodesByDesign } from '../dao';
import { findAllByNodes as findAllLayouts } from '../../attributes/layout-attributes/dao';
import { findAllByNodes as findAllMaterials } from '../../attributes/material-attributes/dao';
import { findAllByNodes as findAllImages } from '../../attributes/image-attributes/dao';
import {
  AssetLinks,
  getLinksForAsset
} from '../../../services/attach-asset-links';
import LayoutAttribute from '../../attributes/layout-attributes/domain-object';

interface AssetWithLinks extends Asset {
  assetLinks: AssetLinks | null;
}

export interface NodeAttributes {
  artworks: never[];
  dimensions: LayoutAttribute[];
  materials: MaterialAttribute[];
  sketches: ImageAttribute[];
}

export interface NodeResources {
  assets: AssetWithLinks[];
  attributes: NodeAttributes;
  nodes: Node[];
}

/**
 * Returns a list of all nodes and attributes associated with the design.
 */
export async function getAllByDesign(designId: string): Promise<NodeResources> {
  const rootNodes = await findRootNodesByDesign(designId);
  const allNodes = await findNodeTrees(
    rootNodes.map((rootNode: Node): string => rootNode.id)
  );
  const allNodeIds = allNodes.map((node: Node): string => node.id);

  const materials = await findAllMaterials(allNodeIds);
  const plainMaterials: MaterialAttribute[] = [];
  const materialAssets = materials.map(
    (materialWithAsset: MaterialAttributeWithAsset): Asset => {
      const { asset, ...material } = materialWithAsset;
      plainMaterials.push(material);
      return asset;
    }
  );

  const images = await findAllImages(allNodeIds);
  const plainImages: ImageAttribute[] = [];
  const imageAssets = images.map(
    (imageWithAsset: ImageAttributeWithAsset): Asset => {
      const { asset, ...image } = imageWithAsset;
      plainImages.push(image);
      return asset;
    }
  );

  const layouts = await findAllLayouts(allNodeIds);

  const assetSet = [...materialAssets, ...imageAssets];
  const assetsWithLinks = assetSet.map(
    (asset: Asset): AssetWithLinks => {
      return {
        ...asset,
        assetLinks: getLinksForAsset(asset)
      };
    }
  );

  return {
    assets: assetsWithLinks,
    attributes: {
      artworks: [],
      materials: plainMaterials,
      sketches: plainImages,
      dimensions: layouts
    },
    nodes: allNodes
  };
}
