import { test, Test } from "../../test-helpers/fresh";
import { create, findByPhase, findByStageTitle, update } from "./index";
import * as StageTemplatesDAO from "../stage-templates";
import { CollaboratorRole } from "../../components/collaborators/types";

test("TaskTemplatesDAO supports creation/retrieval", async (t: Test) => {
  const stageOne = await StageTemplatesDAO.create({
    description: "It begins",
    ordering: 0,
    title: "Stage 1",
  });

  const stageTwo = await StageTemplatesDAO.create({
    description: "It continues",
    ordering: 1,
    title: "Stage 2",
  });

  await create({
    assigneeRole: CollaboratorRole.CALA,
    description: "Do the thing",
    designPhase: "POST_CREATION",
    ordering: 0,
    stageTemplateId: stageOne.id,
    title: "Task 1",
  });
  await create({
    assigneeRole: CollaboratorRole.CALA,
    description: "Do another thing",
    designPhase: "POST_CREATION",
    ordering: 2,
    stageTemplateId: stageOne.id,
    title: "Task 2",
  });
  await create({
    assigneeRole: CollaboratorRole.CALA,
    description: "Do yet another thing",
    designPhase: "POST_CREATION",
    ordering: 4,
    stageTemplateId: stageOne.id,
    title: "Task 3",
  });
  const stageTwoTaskOne = await create({
    assigneeRole: CollaboratorRole.DESIGNER,
    description: "Stop doing so much",
    designPhase: "POST_APPROVAL",
    ordering: 1,
    stageTemplateId: stageTwo.id,
    title: "Take a deep breath",
  });

  const templates = await findByPhase("POST_CREATION");
  t.deepEqual(templates.length, 3);
  t.equal(templates[0].title, "Task 1");
  t.equal(templates[0].description, "Do the thing");
  t.equal(templates[0].ordering, 0);

  t.equal(templates[1].title, "Task 2");
  t.equal(templates[1].description, "Do another thing");
  t.equal(templates[1].ordering, 2);

  t.equal(templates[2].title, "Task 3");
  t.equal(templates[2].description, "Do yet another thing");
  t.equal(templates[2].ordering, 4);

  const byStageTitle = await findByStageTitle("Stage 2");
  t.deepEqual(
    byStageTitle,
    [stageTwoTaskOne],
    "Returns only tasks in the given stage"
  );
});

test("TaskTemplatesDAO supports update", async (t: Test) => {
  const stageOne = await StageTemplatesDAO.create({
    description: "It begins",
    ordering: 0,
    title: "Stage 1",
  });

  const created = await create({
    assigneeRole: CollaboratorRole.CALA,
    description: "Do the thing",
    designPhase: "POST_CREATION",
    ordering: 0,
    stageTemplateId: stageOne.id,
    title: "Task 1",
  });
  const updated = await update(created.id, {
    designPhase: "POST_APPROVAL",
  });

  const templates = await findByPhase("POST_APPROVAL");
  t.deepEqual(templates, [updated], "Updates the task template");
});
