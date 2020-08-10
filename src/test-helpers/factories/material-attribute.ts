import uuid from "node-uuid";
import Knex from "knex";

import { findById as findUserById } from "../../components/users/dao";
import createUser = require("../create-user");
import User from "../../components/users/domain-object";

import { create } from "../../components/attributes/material-attributes/dao";
import MaterialAttribute from "../../components/attributes/material-attributes/domain-objects";

import Node from "../../components/nodes/domain-objects";
import { findById as findNode } from "../../components/nodes/dao";
import generateNode from "./node";

import Asset from "../../components/assets/types";
import { findById as findAsset } from "../../components/assets/dao";
import generateAsset from "./asset";

export default async function generateMaterialAttribute(
  options: Partial<MaterialAttribute> = {},
  trx: Knex.Transaction
): Promise<{
  asset: Asset;
  createdBy: User;
  material: MaterialAttribute;
  node: Node;
}> {
  const { user }: { user: User | null } = options.createdBy
    ? { user: await findUserById(options.createdBy, trx) }
    : await createUser({ withSession: false });
  const { node }: { node: Node | null } = options.nodeId
    ? { node: await findNode(options.nodeId, trx) }
    : await generateNode({}, trx);
  const { asset }: { asset: Asset | null } = options.assetId
    ? { asset: await findAsset(options.assetId) }
    : await generateAsset({});

  if (!asset) {
    throw new Error("Could not get an asset.");
  }

  if (!node) {
    throw new Error("Could not get a node.");
  }

  if (!user) {
    throw new Error("Could not get user.");
  }

  const materialData: MaterialAttribute = {
    assetId: asset.id,
    createdAt: new Date("2019-04-20"),
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    height: 0,
    nodeId: node.id,
    width: 0,
    ...options,
  };
  const material = await create(materialData, trx);

  return {
    asset,
    createdBy: user,
    material,
    node,
  };
}
