import Node from '../domain-objects';
import ArtworkAttribute from '../../attributes/artwork-attributes/domain-objects';
import MaterialAttribute from '../../attributes/material-attributes/domain-objects';
import SketchAttribute from '../../attributes/sketch-attributes/domain-objects';
import Asset from '../../assets/domain-object';
import ArtworkAttributeWithAsset from '../../attributes/artwork-attributes/domain-objects/with-asset';
import MaterialAttributeWithAsset from '../../attributes/material-attributes/domain-objects/with-asset';
import SketchAttributeWithAsset from '../../attributes/sketch-attributes/domain-objects/with-asset';
import { findNodeTrees, findRootNodesByDesign } from '../dao';
import { findAllByNodes as findAllArtworks } from '../../attributes/artwork-attributes/dao';
import { findAllByNodes as findAllDimensions } from '../../attributes/dimension-attributes/dao';
import { findAllByNodes as findAllMaterials } from '../../attributes/material-attributes/dao';
import { findAllByNodes as findAllSketches } from '../../attributes/sketch-attributes/dao';
import {
  AssetLinks,
  getLinksForAsset
} from '../../../services/attach-asset-links';
import DimensionAttribute from '../../attributes/dimension-attributes/domain-object';

interface AssetWithLinks extends Asset {
  assetLinks: AssetLinks | null;
}

export interface NodeResources {
  assets: AssetWithLinks[];
  attributes: {
    artworks: ArtworkAttribute[];
    materials: MaterialAttribute[];
    sketches: SketchAttribute[];
    dimensions: DimensionAttribute[];
  };
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

  const artworks = await findAllArtworks(allNodeIds);
  const plainArtworks: ArtworkAttribute[] = [];
  const artworkAssets = artworks.map(
    (artworkWithAsset: ArtworkAttributeWithAsset): Asset => {
      const { asset, ...artwork } = artworkWithAsset;
      plainArtworks.push(artwork);
      return asset;
    }
  );

  const materials = await findAllMaterials(allNodeIds);
  const plainMaterials: MaterialAttribute[] = [];
  const materialAssets = materials.map(
    (materialWithAsset: MaterialAttributeWithAsset): Asset => {
      const { asset, ...material } = materialWithAsset;
      plainMaterials.push(material);
      return asset;
    }
  );

  const sketches = await findAllSketches(allNodeIds);
  const plainSketches: SketchAttribute[] = [];
  const sketchAssets = sketches.map(
    (sketchWithAsset: SketchAttributeWithAsset): Asset => {
      const { asset, ...sketch } = sketchWithAsset;
      plainSketches.push(sketch);
      return asset;
    }
  );

  const dimensions = await findAllDimensions(allNodeIds);

  const assetSet = [...artworkAssets, ...materialAssets, ...sketchAssets];
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
      artworks: plainArtworks,
      materials: plainMaterials,
      sketches: plainSketches,
      dimensions
    },
    nodes: allNodes
  };
}
