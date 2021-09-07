import Knex from "knex";

import * as CollaboratorsDAO from "../../components/collaborators/dao";
import * as TaskEventsDAO from "../../dao/task-events";
import * as StagesDAO from "../../dao/product-design-stages";
import * as ApprovalStepsDAO from "../../components/approval-steps/dao";
import createDesign from "./index";
import db from "../db";
import createUser from "../../test-helpers/create-user";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import generateCollection from "../../test-helpers/factories/collection";
import * as CollectionsDAO from "../../components/collections/dao";
import { generateTeam } from "../../test-helpers/factories/team";
import * as CreateDesignTasksService from "../create-design-tasks";

test("createDesign service creates a collaborator", async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "A brand new design",
    userId: user.id,
  });

  const collaborators = await CollaboratorsDAO.findByDesign(design.id);
  t.equal(collaborators.length, 1, "There is a collaborator on the new design");
  t.equal(collaborators[0].userId, user.id, "The collaborator is the user");

  const tasks = await TaskEventsDAO.findByDesignId(design.id);
  t.equal(tasks.length > 0, true, "There are tasks on the new design");
  t.equal(
    tasks[0].assignees[0].userId,
    user.id,
    "Task is assigned to the user"
  );

  const stages = await StagesDAO.findAllByDesignId(design.id);
  t.equal(stages.length, 2, "There are stages on the new design");

  const approvalSteps = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, design.id)
  );
  t.equal(approvalSteps.length, 4, "There are steps on the new design");
});

test("createDesign puts the design into the collection", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { collection } = await generateCollection();

  sandbox().stub(CreateDesignTasksService, "createDesignTasks");

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "A brand new design",
    userId: user.id,
    collectionIds: [collection.id],
  });

  const collaborators = await CollaboratorsDAO.findByDesign(design.id);
  t.equal(
    collaborators.length,
    0,
    "no collaborator is made for a team collection design"
  );

  const collections = await CollectionsDAO.findByDesign(design.id);
  t.deepEqual(
    collections,
    [
      {
        ...collection,
        designs: [
          {
            id: design.id,
            title: design.title,
            imageAssets: [],
            createdAt: design.createdAt,
          },
        ],
      },
    ],
    "The design has been moved into the collection"
  );
});

test("createDesign doesn't create a collaborator in case of team collection", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { team } = await generateTeam(user.id);
  const { collection } = await generateCollection({ teamId: team.id });

  sandbox().stub(CreateDesignTasksService, "createDesignTasks");

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "A brand new design",
    userId: user.id,
    collectionIds: [collection.id],
  });

  const collaborators = await CollaboratorsDAO.findByDesign(design.id);
  t.equal(
    collaborators.length,
    0,
    "There is no collaborators on the new design"
  );

  const collections = await CollectionsDAO.findByDesign(design.id);
  t.deepEqual(
    collections,
    [
      {
        ...collection,
        designs: [
          {
            id: design.id,
            title: design.title,
            imageAssets: [],
            createdAt: design.createdAt,
          },
        ],
      },
    ],
    "The design has been moved into the collection"
  );
});
