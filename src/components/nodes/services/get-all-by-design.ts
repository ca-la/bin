import { groupBy } from "lodash";
import {
  PhidiasImage,
  PhidiasLayout,
  PhidiasNode,
} from "@cala/ts-lib/dist/phidias";
import {
  DEPRECATED_NullNode,
  FrameNode,
  ImageNode,
  VectorNode,
} from "@cala/ts-lib/dist/phidias/node";

import Node from "../domain-objects";
import MaterialAttribute from "../../attributes/material-attributes/domain-objects";
import ImageAttribute from "../../attributes/image-attributes/domain-objects";
import Asset from "../../assets/domain-object";
import MaterialAttributeWithAsset from "../../attributes/material-attributes/domain-objects/with-asset";
import ImageAttributeWithAsset from "../../attributes/image-attributes/domain-objects/with-asset";
import { findNodeTrees, findRootNodesByDesign } from "../dao";
import { findAllByNodes as findAllMaterials } from "../../attributes/material-attributes/dao";
import { findAllByNodes as findAllLayouts } from "../../attributes/layout-attributes/dao";
import { findAllByNodes as findAllImages } from "../../attributes/image-attributes/dao";

import {
  AssetLinks,
  getLinksForAsset,
} from "../../../services/attach-asset-links";
import LayoutAttribute from "../../attributes/layout-attributes/domain-object";

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
        assetLinks: getLinksForAsset(asset),
      };
    }
  );

  return {
    assets: assetsWithLinks,
    attributes: {
      artworks: [],
      materials: plainMaterials,
      sketches: plainImages,
      dimensions: layouts,
    },
    nodes: allNodes,
  };
}

function isIntermediateNullNode(node: Node): node is DEPRECATED_NullNode {
  return node.type === null;
}

function isIntermediateFrameNode(
  node: Node
): node is Omit<FrameNode, "layout"> {
  return node.type === "FRAME";
}

function isIntermediateImageNode(
  node: Node
): node is Omit<ImageNode, "layout" | "image"> {
  return node.type === "IMAGE";
}

function isIntermediateVectorNode(
  node: Node
): node is Omit<VectorNode, "layout" | "image"> {
  return node.type === "VECTOR";
}

interface NodeAttributeMap {
  [nodeId: string]: {
    layout: PhidiasLayout | null;
    image: PhidiasImage | null;
  };
}

function denormalizeNode(
  context: NodeAttributeMap
): (node: Node) => PhidiasNode {
  return (node: Node): PhidiasNode => {
    const { layout, image } = context[node.id];
    if (isIntermediateNullNode(node)) {
      return node;
    }
    if (isIntermediateFrameNode(node) && layout) {
      return {
        ...node,
        layout,
      };
    }
    if (
      (isIntermediateImageNode(node) || isIntermediateVectorNode(node)) &&
      layout &&
      image
    ) {
      return {
        ...node,
        layout,
        image,
      };
    }

    throw new TypeError(
      "Node type is unknown, or required attributes are missing"
    );
  };
}

export async function getAllByDesignInclude(
  designId: string
): Promise<PhidiasNode[]> {
  const rootNodes = await findRootNodesByDesign(designId);
  const allNodes = await findNodeTrees(
    rootNodes.map((rootNode: Node): string => rootNode.id)
  );
  const allNodeIds = allNodes.map((node: Node): string => node.id);

  const images = groupBy(await findAllImages(allNodeIds), "nodeId");
  const layouts = groupBy(await findAllLayouts(allNodeIds), "nodeId");
  const nodeAttributeMap: NodeAttributeMap = allNodes.reduce(
    (acc: NodeAttributeMap, node: Node): NodeAttributeMap => {
      const imagesForNode = images[node.id];
      const layoutsForNode = layouts[node.id];
      return {
        ...acc,
        [node.id]: {
          layout: layoutsForNode ? layoutsForNode[0] : null,
          image: imagesForNode ? imagesForNode[0] : null,
        },
      };
    },
    {}
  );

  return allNodes.map(denormalizeNode(nodeAttributeMap));
}
