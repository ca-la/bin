import tape from "tape";

import db from "../../../services/db";
import * as SplitComponentService from "../../components/split";
import { sandbox, test } from "../../../test-helpers/fresh";
import { splitCanvas } from "./split";
import generateComponent from "../../../test-helpers/factories/component";
import generateCanvas from "../../../test-helpers/factories/product-design-canvas";

test("splitCanvas", async (t: tape.Test) => {
  const { component: original } = await generateComponent({});
  const { component: component1 } = await generateComponent({
    createdBy: original.createdBy,
    sketchId: original.sketchId,
    assetPageNumber: 1,
  });
  const { component: component2 } = await generateComponent({
    createdBy: original.createdBy,
    sketchId: original.sketchId,
    assetPageNumber: 2,
  });
  const { component: component3 } = await generateComponent({
    createdBy: original.createdBy,
    sketchId: original.sketchId,
    assetPageNumber: 3,
  });

  sandbox()
    .stub(SplitComponentService, "splitComponent")
    .resolves([component1, component2, component3]);

  const { canvas } = await generateCanvas({
    componentId: original.id,
    title: "Foo",
  });

  const trx = await db.transaction();
  try {
    const result = await splitCanvas(trx, canvas);
    t.equal(result.length, 3);
    t.equal(result[0].canvas.componentId, component1.id);
    t.equal(result[0].canvas.title, "Foo (Page 1)");
    t.equal(result[1].canvas.componentId, component2.id);
    t.equal(result[1].canvas.title, "Foo (Page 2)");
    t.equal(result[2].canvas.componentId, component3.id);
    t.equal(result[2].canvas.title, "Foo (Page 3)");
  } finally {
    await trx.rollback();
  }
});
