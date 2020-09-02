import createCollection from "./collection";
import ProductDesignsDAO = require("../../components/product-designs/dao");
import CollectionDb from "../../components/collections/domain-object";
import { findById as findUserById } from "../../components/users/dao";
import createUser = require("../create-user");
import User from "../../components/users/domain-object";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");
import { moveDesign } from "../collections";

interface CollectionWithResources {
  collection: CollectionDb;
  design: ProductDesign;
  user: User;
}

export default async function createCollectionDesign(
  designerUserId?: string
): Promise<CollectionWithResources> {
  const { user }: { user: User | null } = designerUserId
    ? { user: await findUserById(designerUserId) }
    : await createUser({ withSession: false });

  if (!user) {
    throw new Error("User is missing or failed to be created");
  }

  const { collection } = await createCollection({ createdBy: user.id });
  const design = await ProductDesignsDAO.create({
    productType: "A product type",
    title: "A design",
    userId: user.id,
  });
  await moveDesign(collection.id, design.id);

  return {
    collection,
    design,
    user,
  };
}
