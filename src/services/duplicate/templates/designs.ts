import Knex from "knex";
import { omit } from "lodash";
import { constructNodeTree, PhidiasNode } from "@cala/ts-lib/dist/phidias";

import DesignsDAO from "../../../components/product-designs/dao";
import createDesign from "../../create-design";

import Design = require("../../../components/product-designs/domain-objects/product-design");
import prepareForDuplication from "../prepare-for-duplication";
import ResourceNotFoundError from "../../../errors/resource-not-found";
import {
  findNodeTrees,
  findRootNodesByDesign,
} from "../../../components/nodes/dao";
import { findAndDuplicateNode } from "../nodes";
import Node from "../../../components/nodes/domain-objects";

/**
 * Finds the given template design and duplicates it. Does the same with all related
 * Phidias sub-resources.
 * Design --> Nodes
 */
export default async function findAndDuplicateTemplateDesign(
  designId: string,
  newCreatorId: string,
  trx: Knex.Transaction
): Promise<Design> {
  const design = await DesignsDAO.findById(designId, undefined, undefined, trx);

  if (!design) {
    throw new ResourceNotFoundError(`Design ${designId} not found.`);
  }

  const duplicatedDesign = await createDesign(
    prepareForDuplication(
      omit(
        design,
        "collections",
        "collectionIds",
        "imageIds",
        "imageLinks",
        "approvalSteps"
      ),
      { userId: newCreatorId }
    ),
    trx
  );

  const rootNodes = await findRootNodesByDesign(designId, trx);
  const allNodes = await findNodeTrees(
    rootNodes.map((rootNode: Node): string => {
      return rootNode.id;
    }),
    trx
  );

  // constructs a tree that's acyclic.
  const { tree } = constructNodeTree(allNodes as PhidiasNode[]);

  for (const rootNode of rootNodes) {
    await findAndDuplicateNode({
      isRoot: true,
      newCreatorId,
      newDesignId: duplicatedDesign.id,
      nodeId: rootNode.id,
      tree,
      trx,
    });
  }

  return duplicatedDesign;
}
