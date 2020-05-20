import uuid from "node-uuid";
import Knex from "knex";

import { findById as findUserById } from "../../components/users/dao";
import createUser = require("../create-user");
import User from "../../components/users/domain-object";

import { create } from "../../components/attributes/layout-attributes/dao";
import LayoutAttribute from "../../components/attributes/layout-attributes/domain-object";

import Node from "../../components/nodes/domain-objects";
import { findById as findNode } from "../../components/nodes/dao";
import generateNode from "./node";

export default async function generateLayoutAttribute(
  options: Partial<LayoutAttribute> = {},
  trx: Knex.Transaction
): Promise<{
  createdBy: User;
  layout: LayoutAttribute;
  node: Node;
}> {
  const { user }: { user: User | null } = options.createdBy
    ? { user: await findUserById(options.createdBy, trx) }
    : await createUser({ withSession: false });
  const { node }: { node: Node | null } = options.nodeId
    ? { node: await findNode(options.nodeId, trx) }
    : await generateNode({}, trx);

  if (!node) {
    throw new Error("Could not get a node.");
  }

  if (!user) {
    throw new Error("Could not get user.");
  }

  const layout = await create(
    staticLayoutAttribute({
      createdBy: user.id,
      nodeId: node.id,
      ...options,
    }),
    trx
  );

  return {
    createdBy: user,
    layout,
    node,
  };
}

/**
 * Creates an in-memory instance of a dimension attribute.
 */
export function staticLayoutAttribute(
  options: Partial<LayoutAttribute> = {}
): LayoutAttribute {
  return {
    createdAt: new Date("2019-04-20"),
    createdBy: uuid.v4(),
    deletedAt: null,
    id: uuid.v4(),
    height: 0,
    nodeId: uuid.v4(),
    width: 0,
    ...options,
  };
}
