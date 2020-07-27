import uuid from "node-uuid";
import { create } from "../../components/design-events/dao";
import DesignEvent, {
  templateDesignEvent,
} from "../../components/design-events/types";
import { findById as findUserById } from "../../components/users/dao";
import createUser from "../create-user";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");
import ProductDesignsDAO from "../../components/product-designs/dao";
import Knex from "knex";
import db from "../../services/db";

interface DesignEventWithResources {
  designEvent: DesignEvent;
  design: ProductDesign;
  actor: any;
}

export default async function generateDesignEvent(
  options: Partial<DesignEvent> = {}
): Promise<DesignEventWithResources> {
  const { user: actor } = options.actorId
    ? { user: await findUserById(options.actorId) }
    : await createUser({ withSession: false });
  const design = options.designId
    ? await ProductDesignsDAO.findById(options.designId)
    : await ProductDesignsDAO.create({
        productType: "SWEATER",
        title: "Mohair Wool Sweater",
        userId: actor.id,
      });

  if (!design) {
    throw new Error("Design was unable to be found or created!");
  }

  const designEvent = await db.transaction((trx: Knex.Transaction) =>
    create(trx, {
      ...templateDesignEvent,
      createdAt: new Date(),
      actorId: actor.id,
      designId: design.id,
      id: uuid.v4(),
      type: "SUBMIT_DESIGN",
      ...options,
    })
  );

  return { actor, designEvent, design };
}
