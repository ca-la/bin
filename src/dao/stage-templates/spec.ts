import { test, Test } from "../../test-helpers/fresh";
import { create, findAll } from "./index";

test("StageTemplatesDAO supports creation/retrieval", async (t: Test) => {
  await create({
    description: "Create",
    ordering: 0,
    title: "Stage 1",
  });
  await create({
    description: "Fulfill",
    ordering: 3,
    title: "Stage 3",
  });
  await create({
    description: "Produce",
    ordering: 1,
    title: "Stage 2",
  });

  const templates = await findAll();
  t.equal(templates.length, 3);
  t.equal(templates[0].title, "Stage 1");
  t.equal(templates[0].description, "Create");
  t.equal(templates[1].title, "Stage 2");
  t.equal(templates[1].description, "Produce");
  t.equal(templates[2].title, "Stage 3");
  t.equal(templates[2].description, "Fulfill");
});
