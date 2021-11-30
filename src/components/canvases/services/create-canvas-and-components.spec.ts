import Knex from "knex";
import uuid from "node-uuid";
import tape from "tape";
import createUser from "../../../test-helpers/create-user";
import { staticAsset } from "../../../test-helpers/factories/asset";
import { generateDesign } from "../../../test-helpers/factories/product-design";
import { db, sandbox, test } from "../../../test-helpers/fresh";
import { ComponentType } from "../../components/types";
import { generateComponent } from "../endpoints/canvas";
import * as EnrichmentService from "../../../services/enrich-component";
import { createCanvasAndComponents } from "./create-canvas-and-components";

interface SetupOptions {
  type: ComponentType;
}

async function setup({ type }: SetupOptions) {
  const { user } = await createUser();
  const design = await generateDesign({ userId: user.id });

  const component = generateComponent({
    asset: staticAsset(),
    userId: user.id,
    type,
  });

  const canvas = {
    id: uuid.v4(),
    archivedAt: null,
    componentId: component.id,
    designId: design.id,
    title: "Canvas",
    ordering: 0,
    components: [component],
    createdBy: user.id,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  };

  sandbox()
    .stub(EnrichmentService, "enrichComponent")
    .resolves({ ...component, assetLink: "asset-link" });

  return { user, canvas, component };
}

test("createCanvasAndComponents sketch", async (t: tape.Test) => {
  const { user, canvas } = await setup({ type: ComponentType.Sketch });

  const canvasWithEnrichedComponents = await db.transaction(
    (trx: Knex.Transaction) => createCanvasAndComponents(trx, user.id, canvas)
  );

  t.deepEquals(
    {
      title: canvasWithEnrichedComponents.title,
      components: {
        type: canvasWithEnrichedComponents.components[0].type,
        assetLink: canvasWithEnrichedComponents.components[0].assetLink,
      },
    },
    {
      title: "Canvas",
      components: {
        type: ComponentType.Sketch,
        assetLink: "asset-link",
      },
    }
  );
});

test("createCanvasAndComponents artwork", async (t: tape.Test) => {
  const { user, canvas } = await setup({ type: ComponentType.Artwork });

  const canvasWithEnrichedComponents = await db.transaction(
    (trx: Knex.Transaction) => createCanvasAndComponents(trx, user.id, canvas)
  );

  t.deepEquals(
    {
      title: canvasWithEnrichedComponents.title,
      components: {
        type: canvasWithEnrichedComponents.components[0].type,
        assetLink: canvasWithEnrichedComponents.components[0].assetLink,
      },
    },
    {
      title: "Canvas",
      components: {
        type: ComponentType.Artwork,
        assetLink: "asset-link",
      },
    }
  );
});

test("createCanvasAndComponents material", async (t: tape.Test) => {
  const { user, canvas } = await setup({ type: ComponentType.Material });

  const canvasWithEnrichedComponents = await db.transaction(
    (trx: Knex.Transaction) => createCanvasAndComponents(trx, user.id, canvas)
  );

  t.deepEquals(
    {
      title: canvasWithEnrichedComponents.title,
      components: {
        type: canvasWithEnrichedComponents.components[0].type,
        assetLink: canvasWithEnrichedComponents.components[0].assetLink,
      },
    },
    {
      title: "Canvas",
      components: {
        type: ComponentType.Material,
        assetLink: "asset-link",
      },
    }
  );
});
