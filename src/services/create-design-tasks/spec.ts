import uuid from "node-uuid";
import Knex from "knex";
import db from "../db";
import * as ProductDesignStagesDAO from "../../dao/product-design-stages";
import * as CollaboratorTasksDAO from "../../dao/collaborator-tasks";
import * as CreateTaskService from "../create-task";
import * as FindTaskTypeCollaborators from "../find-task-type-collaborators";
import CollectionDb from "../../components/collections/domain-object";
import * as CollectionsDAO from "../../components/collections/dao";
import createDesignTasks from "./index";
import createUser from "../../test-helpers/create-user";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");
import User from "../../components/users/domain-object";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import createCollaborator from "../../test-helpers/factories/collaborator";
import Collaborator from "../../components/collaborators/types";
import { getTemplatesFor, taskTypes } from "../../components/tasks/templates";
import createDesign from "../create-design";
import { Complexity } from "../../domain-objects/pricing";

async function createResources(): Promise<{
  user: User;
  design: ProductDesign;
  collection: CollectionDb;
  collaborator: Collaborator;
}> {
  const designer = await createUser({ withSession: false });
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.user.id,
    deletedAt: null,
    description: "We out here",
    id: uuid.v4(),
    teamId: null,
    title: "Season 1",
  });

  const design = await createDesign({
    title: "Tee",
    userId: designer.user.id,
    collectionIds: [collection.id],
  });

  const { collaborator } = await createCollaborator({
    collectionId: collection.id,
    role: "EDIT",
    userId: designer.user.id,
  });

  return {
    collaborator,
    collection,
    design,
    user: designer.user,
  };
}

test("createDesignTasks creates POST_CREATION tasks", async (t: Test) => {
  const { collaborator, design } = await createResources();
  const mockStage = { id: uuid.v4(), title: "Creation" };
  const mockTaskEvent = { id: uuid.v4() };
  const mockCollaboratorTask = {
    collaborators: [collaborator.id],
    taskId: mockTaskEvent.id,
  };

  sandbox()
    .stub(FindTaskTypeCollaborators, "default")
    .resolves({
      [taskTypes.CALA.id]: [],
      [taskTypes.DESIGN.id]: [collaborator],
      [taskTypes.PRODUCTION.id]: [collaborator],
      [taskTypes.TECHNICAL_DESIGN.id]: [collaborator],
      [taskTypes.PRODUCT_PHOTOGRAPHY.id]: [collaborator],
    });

  const stagesStub = sandbox()
    .stub(ProductDesignStagesDAO, "createAll")
    .resolves([mockStage]);
  const createTaskStub = sandbox()
    .stub(CreateTaskService, "createTasks")
    .resolves([mockTaskEvent]);
  const collaboratorsTasksStub = sandbox()
    .stub(CollaboratorTasksDAO, "createAll")
    .resolves([mockCollaboratorTask]);

  return db.transaction(async (trx: Knex.Transaction) => {
    await createDesignTasks(design.id, "POST_CREATION", trx);
    const stages = getTemplatesFor("POST_CREATION", Complexity.BLANK);

    t.equal(stagesStub.callCount, 1, "creates all stages");
    t.ok(
      stagesStub.calledWith([
        {
          description: stages[0].description,
          designId: design.id,
          ordering: stages[0].ordering,
          title: stages[0].title,
        },
        {
          description: stages[1].description,
          designId: design.id,
          ordering: stages[1].ordering,
          title: stages[1].title,
        },
      ]),
      "Creates the first stage"
    );
    t.ok(createTaskStub.called, "creates all tasks");
    t.ok(collaboratorsTasksStub.called, "creates all collaborator tasks");
  });
});
