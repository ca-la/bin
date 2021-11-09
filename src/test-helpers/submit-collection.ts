import uuid from "node-uuid";

import db from "../services/db";
import * as VariantsDAO from "../components/product-design-variants/dao";
import * as DesignEventsDAO from "../components/design-events/dao";
import createUser from "./create-user";
import createDesign from "../services/create-design";
import generatePricingValues from "./factories/pricing-values";
import generateCollection from "./factories/collection";
import { generateTeam } from "./factories/team";
import { templateDesignEvent } from "../components/design-events/types";

const variantBlank = {
  colorName: "Black",
  colorNamePosition: 0,
  isSample: false,
  sku: null,
  unitsToProduce: 25,
  universalProductCode: null,
};

export async function submitCollection(generatePricing: boolean = true) {
  if (generatePricing) {
    await generatePricingValues();
  }

  const designer = await createUser();
  const admin = await createUser({ role: "ADMIN" });
  const { team, subscription } = await generateTeam(designer.user.id);
  const { collection } = await generateCollection({
    createdBy: designer.user.id,
    teamId: team.id,
  });

  const collectionDesigns = [
    {
      ...(await createDesign({
        productType: "A product type",
        title: "Collection Design 1",
        userId: designer.user.id,
        collectionIds: [collection.id],
      })),
      collectionIds: [collection.id],
      collections: [{ id: collection.id, title: collection.title! }],
    },
    {
      ...(await createDesign({
        productType: "A product type",
        title: "Collection Design 2",
        userId: designer.user.id,
        collectionIds: [collection.id],
      })),
      collectionIds: [collection.id],
      collections: [{ id: collection.id, title: collection.title! }],
    },
  ];

  const trx = await db.transaction();

  try {
    const variants = await Promise.all([
      VariantsDAO.createForDesign(trx, collectionDesigns[0].id, [
        {
          ...variantBlank,
          designId: collectionDesigns[0].id,
          id: uuid.v4(),
          position: 0,
          sizeName: "S",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[0].id,
          id: uuid.v4(),
          position: 1,
          sizeName: "M",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[0].id,
          id: uuid.v4(),
          position: 2,
          sizeName: "L",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[0].id,
          id: uuid.v4(),
          position: 3,
          sizeName: "XL",
        },
      ]),
      VariantsDAO.createForDesign(trx, collectionDesigns[1].id, [
        {
          ...variantBlank,
          designId: collectionDesigns[1].id,
          id: uuid.v4(),
          position: 0,
          sizeName: "S",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[1].id,
          id: uuid.v4(),
          position: 1,
          sizeName: "M",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[1].id,
          id: uuid.v4(),
          position: 2,
          sizeName: "L",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[1].id,
          id: uuid.v4(),
          position: 3,
          sizeName: "XL",
        },
      ]),
    ]);

    const draftDesigns = [
      await createDesign({
        productType: "A product type",
        title: "Draft 1",
        userId: designer.user.id,
      }),
      await createDesign({
        productType: "A product type",
        title: "Draft 2",
        userId: designer.user.id,
      }),
    ];
    const designEvents = await DesignEventsDAO.createAll(trx, [
      {
        ...templateDesignEvent,
        actorId: designer.user.id,
        id: uuid.v4(),
        createdAt: new Date(),
        type: "SUBMIT_DESIGN",
        designId: collectionDesigns[0].id,
      },
      {
        ...templateDesignEvent,
        actorId: designer.user.id,
        id: uuid.v4(),
        createdAt: new Date(),
        type: "SUBMIT_DESIGN",
        designId: collectionDesigns[1].id,
      },
    ]);

    await trx.commit();

    return {
      team,
      subscription,
      collection,
      collectionDesigns,
      draftDesigns,
      variants,
      user: {
        designer,
        admin,
      },
      designEvents,
    };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}
