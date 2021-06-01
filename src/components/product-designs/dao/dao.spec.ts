import tape from "tape";
import uuid from "node-uuid";
import Knex from "knex";
import { isEqual } from "lodash";

import { findById, findByIds } from "./";
import {
  deleteByIds,
  findAllDesignsThroughCollaboratorAndTeam,
  findAllWithCostsAndEvents,
  findDesignByAnnotationId,
  findDesignByApprovalStepId,
  findDesignByTaskId,
  isOwner,
  getTitleAndOwnerByShipmentTracking,
  findIdByQuoteId,
  findPaidDesigns,
  findMinimalByIds,
  create,
  findBaseById,
} from "./dao";
import * as ProductDesignsDAO from "../../product-designs/dao/dao";

import { del as deleteCanvas } from "../../canvases/dao";
import * as CollaboratorsDAO from "../../collaborators/dao";
import * as CollectionsDAO from "../../collections/dao";
import * as ProductDesignOptionsDAO from "../../../dao/product-design-options";
import * as ApprovalStepsDAO from "../../approval-steps/dao";
import * as PricingProductTypesDAO from "../../pricing-product-types/dao";
import * as PricingQuotesDAO from "../../../dao/pricing-quotes";
import * as ShipmentTrackingsDAO from "../../shipment-trackings/dao";
import {
  ApprovalStepState,
  ApprovalStepType,
  ApprovalStepRow,
} from "../../approval-steps/types";
import { deleteById as deleteAnnotation } from "../../product-design-canvas-annotations/dao";
import { create as createTask } from "../../../dao/tasks";
import { create as createApprovalTask } from "../../../components/approval-step-tasks/dao";

import { sandbox, test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import generateCanvas from "../../../test-helpers/factories/product-design-canvas";
import generateComponent from "../../../test-helpers/factories/component";
import generateCollection from "../../../test-helpers/factories/collection";

import createDesign from "../../../services/create-design";
import db from "../../../services/db";
import generateAnnotation from "../../../test-helpers/factories/product-design-canvas-annotation";
import generateAsset from "../../../test-helpers/factories/asset";
import generateCollaborator from "../../../test-helpers/factories/collaborator";
import generateDesignEvent from "../../../test-helpers/factories/design-event";
import generatePricingCostInput from "../../../test-helpers/factories/pricing-cost-input";
import generatePricingValues from "../../../test-helpers/factories/pricing-values";
import generateProductDesignStage from "../../../test-helpers/factories/product-design-stage";
import generateTask from "../../../test-helpers/factories/task";
import omit = require("lodash/omit");
import ResourceNotFoundError from "../../../errors/resource-not-found";
import { addDesign } from "../../../test-helpers/collections";
import { CollaboratorWithUser } from "../../collaborators/types";
import { deleteById } from "../../../test-helpers/designs";
import {
  generateDesign,
  staticProductDesign,
} from "../../../test-helpers/factories/product-design";
import generateApprovalStep from "../../../test-helpers/factories/design-approval-step";
import { ComponentType } from "../../components/types";
import ProductDesignWithApprovalSteps from "../domain-objects/product-design-with-approval-steps";
import generateBid from "../../../test-helpers/factories/bid";
import * as Aftership from "../../../components/integrations/aftership/service";
import { generateTeam } from "../../../test-helpers/factories/team";
import { generateTeamUser } from "../../../test-helpers/factories/team-user";
import { rawDao as RawTeamUsersDAO } from "../../team-users/dao";
import { Role as TeamUserRole } from "../../team-users/types";
import { TeamType } from "../../teams/types";
import ProductDesign = require("../domain-objects/product-design");
import { checkout } from "../../../test-helpers/checkout-collection";

test("ProductDesignsDAO supports creation/retrieval, enriched with image links", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const { asset: sketch } = await generateAsset({
    description: "",
    id: uuid.v4(),
    mimeType: "image/png",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "FooBar.png",
    uploadCompletedAt: new Date(),
    userId: user.id,
  });
  const { component } = await generateComponent({
    createdBy: user.id,
    sketchId: sketch.id,
  });
  const { canvas: can1, design } = await generateCanvas({
    componentId: component.id,
    createdBy: user.id,
  });

  const { asset: material } = await generateAsset();
  const mat1 = await ProductDesignOptionsDAO.create({
    id: uuid.v4(),
    isBuiltinOption: true,
    createdAt: new Date(),
    type: "FABRIC",
    title: "A material",
    previewImageId: material.id,
  });
  const { component: comp1 } = await generateComponent({
    artworkId: null,
    sketchId: null,
    materialId: mat1.id,
    createdBy: user.id,
    parentId: null,
    type: ComponentType.Material,
    id: uuid.v4(),
  });
  const { canvas: can2 } = await generateCanvas({
    componentId: comp1.id,
    designId: design.id,
    createdBy: user.id,
  });

  const { asset: uploading } = await generateAsset({
    description: "",
    id: uuid.v4(),
    mimeType: "image/png",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "FooBar.png",
    uploadCompletedAt: null,
    userId: user.id,
  });

  const { component: uploadingComponent } = await generateComponent({
    createdBy: user.id,
    sketchId: uploading.id,
  });
  await generateCanvas({
    componentId: uploadingComponent.id,
    designId: design.id,
    createdBy: user.id,
  });
  const { collection } = await generateCollection({ createdBy: user.id });
  await addDesign(collection.id, design.id);
  const result = await findById(design.id);
  if (!result) {
    throw new Error("Design should have been created!");
  }
  t.deepEqual(
    result.imageIds,
    [sketch.id],
    "Returns the associated image ids for the design"
  );
  t.equal(
    result.previewImageUrls!.length,
    1,
    "Does not return uploading assets"
  );
  t.ok(
    result.previewImageUrls![0].includes(sketch.id),
    "The preview image urls are the same as the image links"
  );

  t.equal(
    result.imageLinks!.length,
    1,
    "Does not return uploading or material assets"
  );
  const { previewLink, thumbnailLink } = result.imageLinks![0];
  t.ok(
    previewLink.includes(sketch.id),
    "Preview link contains the sketch id for the design"
  );
  t.ok(
    thumbnailLink.includes(sketch.id),
    "Preview link contains the sketch id for the design"
  );
  t.deepEqual(
    result.collectionIds,
    [collection.id],
    "Populates collection when added"
  );

  await db.transaction(async (trx: Knex.Transaction) => {
    await deleteCanvas(trx, can1.id);
    await deleteCanvas(trx, can2.id);
    await CollectionsDAO.deleteById(trx, collection.id);
  });

  const secondFetch = await findById(design.id);
  if (!secondFetch) {
    throw new Error("Cannot find Design!");
  }
  t.deepEqual(
    secondFetch.imageIds,
    [],
    "If a canvas gets deleted, the image id list should update accordingly."
  );
  t.deepEqual(
    secondFetch.imageLinks,
    [],
    "If a canvas gets deleted, the image links list should update accordingly."
  );
  t.deepEqual(
    secondFetch.collectionIds,
    [],
    "removes collection id from returned list of ids"
  );
});

test("findAllDesignsThroughCollaboratorAndTeam finds all undeleted designs that the user collaborates on", async (t: tape.Test) => {
  const { user } = await createUser();
  const { user: notUser } = await createUser();

  const ownDesign = await db.transaction((trx: Knex.Transaction) =>
    ProductDesignsDAO.create(trx, "Own Design", user.id)
  );
  // ensure that the design has no collaborators to simulate v1 product designs.
  const existingCollaborators = await CollaboratorsDAO.findByDesign(
    ownDesign.id
  );
  await Promise.all(
    existingCollaborators.map(
      async (collaborator: CollaboratorWithUser): Promise<void> => {
        await CollaboratorsDAO.deleteById(collaborator.id);
      }
    )
  );

  const designSharedDesign = await db.transaction((trx: Knex.Transaction) =>
    ProductDesignsDAO.create(trx, "Design Shared Design", notUser.id)
  );
  await generateCollaborator({
    collectionId: null,
    designId: designSharedDesign.id,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });

  const collectionSharedDesign = await db.transaction((trx: Knex.Transaction) =>
    ProductDesignsDAO.create(trx, "Collection Shared Design", notUser.id)
  );
  const { collection } = await generateCollection({ createdBy: notUser.id });
  await addDesign(collection.id, collectionSharedDesign.id);
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: null,
    role: "VIEW",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: null,
    designId: collectionSharedDesign.id,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateDesignEvent({
    designId: collectionSharedDesign.id,
    actorId: user.id,
    type: "COMMIT_QUOTE",
  });

  const collectionSharedDesignDeleted = await createDesign({
    title: "Collection Shared Design Deleted",
    userId: notUser.id,
    collectionIds: [collection.id],
  });

  const designAndCollectionOwner = await createUser();
  const { team } = await generateTeam(designAndCollectionOwner.user.id);
  generateTeamUser({
    userId: user.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });
  const { collection: teamCollection } = await generateCollection({
    createdBy: designAndCollectionOwner.user.id,
    teamId: team.id,
  });
  const teamSharedDesign = await createDesign({
    userId: designAndCollectionOwner.user.id,
    title: "Team Shared Design",
    collectionIds: [teamCollection.id],
  });

  const designs = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
  });
  t.equal(
    designs.length,
    4,
    "returns only the designs the user collaborates on"
  );
  t.deepEqual(
    designs[0].id,
    teamSharedDesign.id,
    "team shared design / should match ids"
  );
  t.deepEqual(
    designs[0].collaboratorRoles,
    ["EDIT"],
    "team shared design / has collaborator roles attached"
  );
  t.deepEqual(
    designs[0].isCheckedOut,
    false,
    "team shared design / shows checked-out status"
  );
  t.deepEqual(
    designs[1].id,
    collectionSharedDesignDeleted.id,
    "collection shared design / should match ids"
  );
  t.deepEqual(
    designs[1].collaboratorRoles,
    ["VIEW"],
    "collection shared design / has collaborator roles attached"
  );
  t.deepEqual(
    designs[1].isCheckedOut,
    false,
    "collection shared design / shows checked-out status"
  );
  t.deepEqual(
    designs[2].id,
    collectionSharedDesign.id,
    "collection+design shared design / should match ids"
  );
  t.true(
    isEqual(new Set(designs[2].collaboratorRoles), new Set(["VIEW", "EDIT"])),
    "collection+design shared design / has both collaborator roles attached"
  );
  t.deepEqual(
    designs[2].isCheckedOut,
    true,
    "collection+design shared design / shows checked-out status"
  );
  t.deepEqual(
    designs[3].id,
    designSharedDesign.id,
    "design shared design / should match ids"
  );
  t.deepEqual(
    designs[3].collaboratorRoles,
    ["EDIT"],
    "design shared design / has collaborator roles attached"
  );
  t.deepEqual(
    designs[3].isCheckedOut,
    false,
    "design shared design / shows checked-out status"
  );

  await deleteById(collectionSharedDesignDeleted.id);

  const designsAgain = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
  });
  t.equal(
    designsAgain.length,
    3,
    "returns only the undeleted designs the user collaborates on"
  );
  t.deepEqual(
    designsAgain[1].id,
    collectionSharedDesign.id,
    "should match ids"
  );
  t.deepEqual(designsAgain[1].collectionIds, [collection.id]);
  t.deepEqual(designsAgain[2].id, designSharedDesign.id, "should match ids");

  await db.transaction(async (trx: Knex.Transaction) => {
    await CollectionsDAO.deleteById(trx, collection.id);
  });

  const designsYetAgain = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
  });

  t.equal(designsYetAgain.length, 3, "still returns collection design");
  t.equals(
    designsYetAgain[1].id,
    collectionSharedDesign.id,
    "returns design shared by design in the deleted collection"
  );
  t.true(
    isEqual(new Set(designsYetAgain[1].collaboratorRoles), new Set(["EDIT"])),
    "does not include collection role"
  );
  t.equals(
    designsYetAgain[2].id,
    designSharedDesign.id,
    "returns design shared by design"
  );
  t.deepEqual(
    designs[3].teamRoles,
    [],
    "team shared design / has no team roles attached"
  );
  t.deepEqual(
    designs[0].teamRoles,
    ["EDITOR"],
    "team shared design / has team roles attached"
  );
});

test("findAllDesignsThroughCollaboratorAndTeam does not double product design images", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
    title: "design",
    userId: user.id,
  });
  const { asset } = await generateAsset({
    description: "",
    id: uuid.v4(),
    mimeType: "image/png",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "FooBar.png",
    uploadCompletedAt: new Date(),
    userId: user.id,
  });
  const { component } = await generateComponent({
    createdBy: user.id,
    sketchId: asset.id,
  });
  await generateCanvas({
    componentId: component.id,
    createdBy: user.id,
    designId: design.id,
  });
  const { collection } = await generateCollection({ createdBy: user.id });
  await db.transaction((trx: Knex.Transaction) =>
    CollaboratorsDAO.create(
      {
        cancelledAt: null,
        collectionId: collection.id,
        designId: null,
        invitationMessage: null,
        role: "EDIT",
        userEmail: null,
        userId: user.id,
        teamId: null,
      },
      trx
    )
  );
  await addDesign(collection.id, design.id);

  const found = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
  });

  t.deepEqual(found[0].imageIds, [asset.id], "does not duplicate image ids");
});

test("findAllDesignsThroughCollaboratorAndTeam finds all designs with a search string", async (t: tape.Test) => {
  const { user } = await createUser();

  const firstDesign = await createDesign({
    productType: "test",
    title: "first design",
    userId: user.id,
  });
  const secondDesign = await createDesign({
    productType: "test",
    title: "second design",
    userId: user.id,
  });

  const { collection } = await generateCollection({
    createdBy: user.id,
    title: "Collection",
  });
  await addDesign(collection.id, secondDesign.id);

  const allDesigns = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
  });
  t.equal(
    allDesigns.length,
    2,
    "returns all designs when no search is provided"
  );

  const designSearch = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
    search: "first",
  });
  t.equal(
    designSearch.length,
    1,
    "returns design when searched by design title"
  );
  t.deepEqual(designSearch[0].id, firstDesign.id, "should match ids");
});

test("findAllDesignsThroughCollaboratorAndTeam returns approval steps, progress and related fields", async (t: tape.Test) => {
  const testDate = new Date(2012, 11, 22);
  sandbox().useFakeTimers(testDate);
  sandbox().stub(PricingProductTypesDAO, "findByDesignId").resolves({
    complexity: "BLANK",
  });
  sandbox()
    .stub(PricingQuotesDAO, "findByDesignId")
    .resolves([
      {
        processes: [],
      },
    ]);
  const { user } = await createUser();
  const { user: notUser } = await createUser();

  const ownDesign = await createDesign({
    productType: "test",
    title: "design",
    userId: user.id,
  });

  const collectionSharedDesign = await createDesign({
    productType: "test",
    title: "design",
    userId: notUser.id,
  });
  const { collection } = await generateCollection({ createdBy: notUser.id });
  await addDesign(collection.id, collectionSharedDesign.id);
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await db.transaction(async (trx: Knex.Transaction) => {
    const steps = await ApprovalStepsDAO.findByDesign(
      trx,
      collectionSharedDesign.id
    );
    await ApprovalStepsDAO.update(trx, steps[0].id, {
      state: ApprovalStepState.COMPLETED,
      completedAt: new Date(),
    });
    await ApprovalStepsDAO.update(trx, steps[1].id, {
      reason: null,
      state: ApprovalStepState.COMPLETED,
      startedAt: new Date(),
      completedAt: new Date(),
    });
    await ApprovalStepsDAO.update(trx, steps[2].id, {
      reason: "Needs salt.",
      state: ApprovalStepState.BLOCKED,
      dueAt: new Date(),
    });
    await ApprovalStepsDAO.update(trx, steps[3].id, {
      dueAt: new Date(),
    });
  });
  const designs = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
  });
  t.equal(designs.length, 2);
  t.deepEqual(designs[0].id, collectionSharedDesign.id);
  t.deepEqual(Number(designs[0].progress), 0.5, "has progress");
  t.deepEqual(
    designs[0].firstStepCreatedAt,
    testDate,
    "has firstStepStartedAt"
  );
  t.deepEqual(designs[0].lastStepDueAt, testDate, "has lastStepDueAt");
  t.deepEqual(designs[0].approvalSteps!.length, 4);
  t.deepEqual(designs[0].approvalSteps![1].state, "COMPLETED");
  t.deepEqual(designs[0].approvalSteps![1].designId, designs[0].id);
  t.deepEqual(designs[0].approvalSteps![2].state, "BLOCKED");
  t.deepEqual(designs[0].approvalSteps![2].designId, designs[0].id);

  t.deepEqual(designs[1].id, ownDesign.id);
  t.deepEqual(designs[1].approvalSteps!.length, 4);
  t.deepEqual(designs[1].approvalSteps![0].state, "CURRENT");
  t.deepEqual(designs[1].approvalSteps![0].designId, designs[1].id);
  t.deepEqual(designs[1].approvalSteps![1].state, "BLOCKED");
  t.deepEqual(designs[1].approvalSteps![1].designId, designs[1].id);
});

test("findAllDesignsThroughCollaboratorAndTeam respects limit, offset, sortBy", async (t: tape.Test) => {
  const { user } = await createUser();

  const d1 = await createDesign({
    productType: "test",
    title: "C",
    userId: user.id,
  });
  const d2 = await createDesign({
    productType: "test",
    title: "A",
    userId: user.id,
  });
  const d3 = await createDesign({
    productType: "test",
    title: "B",
    userId: user.id,
  });

  const { collection: c1 } = await generateCollection({
    createdBy: user.id,
    title: "A",
  });
  const { collection: c2 } = await generateCollection({
    createdBy: user.id,
    title: "B",
  });
  await addDesign(c1.id, d3.id);
  await addDesign(c2.id, d1.id);

  type Options = Partial<{
    sortBy: string;
    limit: number;
    offset: number;
  }>;
  interface TestCase {
    options: Options;
    resultIds: string[];
  }

  const testCases: TestCase[] = [
    {
      options: {
        sortBy: "product_designs.created_at:asc",
      },
      resultIds: [d1.id, d2.id, d3.id],
    },
    {
      options: {
        sortBy: "product_designs.title:asc",
      },
      resultIds: [d2.id, d3.id, d1.id],
    },
    {
      options: {
        sortBy: "product_designs.title:desc",
      },
      resultIds: [d1.id, d3.id, d2.id],
    },
    {
      options: {
        sortBy: "collections.title:asc",
      },
      resultIds: [d3.id, d1.id, d2.id],
    },
    {
      options: {
        sortBy: "collections.title:desc",
      },
      resultIds: [d2.id, d1.id, d3.id],
    },
    {
      options: {
        sortBy: "collections.title:desc",
        limit: 2,
      },
      resultIds: [d2.id, d1.id],
    },
    {
      options: {
        sortBy: "collections.title:desc",
        limit: 5,
        offset: 1,
      },
      resultIds: [d1.id, d3.id],
    },
  ];

  for (const testCase of testCases) {
    const allDesigns = await findAllDesignsThroughCollaboratorAndTeam({
      userId: user.id,
      ...testCase.options,
    });
    t.deepEqual(
      allDesigns.map((design: ProductDesignWithApprovalSteps) => design.id),
      testCase.resultIds,
      JSON.stringify(testCase.options)
    );
  }
});

test("findAllDesignsThroughCollaboratorAndTeam filters by collection", async (t: tape.Test) => {
  const { user } = await createUser();

  const firstDesign = await createDesign({
    productType: "test",
    title: "first design",
    userId: user.id,
  });
  const secondDesign = await createDesign({
    productType: "test",
    title: "second design",
    userId: user.id,
  });
  await createDesign({
    productType: "test",
    title: "third design",
    userId: user.id,
  });

  const { collection: collectionOne } = await generateCollection({
    createdBy: user.id,
    title: "Collection 1",
  });
  await addDesign(collectionOne.id, firstDesign.id);
  const { collection: collectionTwo } = await generateCollection({
    createdBy: user.id,
    title: "Collection 2",
  });
  await addDesign(collectionTwo.id, secondDesign.id);

  const allCollectionDesigns = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
    filters: [{ type: "COLLECTION", value: "*" }],
  });
  t.equal(allCollectionDesigns.length, 2, "returns all designs in collections");
  t.true(
    isEqual(
      new Set(
        allCollectionDesigns.map(
          (design: ProductDesignWithApprovalSteps) => design.id
        )
      ),
      new Set([firstDesign.id, secondDesign.id])
    )
  );

  const collectionSearch = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
    filters: [{ type: "COLLECTION", value: collectionOne.id }],
  });
  t.equal(
    collectionSearch.length,
    1,
    "returns design when filtered by collection id"
  );
  t.deepEqual(collectionSearch[0].id, firstDesign.id, "should match ids");
});

test("findAllDesignsThroughCollaboratorAndTeam filters by team", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: otherTeamOwner } = await createUser({ withSession: false });
  const { team } = await generateTeam(user.id);
  const { team: otherTeam } = await generateTeam(otherTeamOwner.id);

  const firstDesign = await createDesign({
    productType: "test",
    title: "first design",
    userId: user.id,
  });
  const secondDesign = await createDesign({
    productType: "test",
    title: "second design",
    userId: otherTeamOwner.id,
  });
  const thirdDesign = await createDesign({
    productType: "test",
    title: "third design",
    userId: user.id,
  });

  const { collection: collectionOne } = await generateCollection({
    createdBy: user.id,
    title: "Collection 1",
    teamId: team.id,
  });
  await addDesign(collectionOne.id, firstDesign.id);
  const { collection: collectionTwo } = await generateCollection({
    createdBy: user.id,
    title: "Collection 2",
    teamId: otherTeam.id,
  });
  await addDesign(collectionTwo.id, secondDesign.id);

  const { collection: collectionThree } = await generateCollection({
    createdBy: user.id,
    title: "Collection 3",
    teamId: null,
  });
  await addDesign(collectionThree.id, thirdDesign.id);

  const teamDesigns = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
    filters: [{ type: "TEAM", value: team.id }],
  });
  t.equal(
    teamDesigns.length,
    1,
    "returns all designs in that team's collection"
  );
  t.true(
    isEqual(
      new Set(
        teamDesigns.map((design: ProductDesignWithApprovalSteps) => design.id)
      ),
      new Set([firstDesign.id])
    ),
    "finds the correct team designs"
  );

  const otherTeamsDesigns = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
    filters: [{ type: "TEAM", value: otherTeam.id }],
  });
  t.deepEqual(otherTeamsDesigns, [], "returns empty results");

  const nonTeamDesigns = await findAllDesignsThroughCollaboratorAndTeam({
    userId: user.id,
    filters: [{ type: "TEAM", value: null }],
  });
  t.true(
    isEqual(
      new Set(
        nonTeamDesigns.map(
          (design: ProductDesignWithApprovalSteps) => design.id
        )
      ),
      new Set([thirdDesign.id])
    ),
    "finds the correct non-team designs"
  );
});

test("findAllDesignsThroughCollaboratorAndTeam filters by current step", async (t: tape.Test) => {
  const { user } = await createUser();
  const d1 = await createDesign({
    productType: "test",
    title: "first design",
    userId: user.id,
  });
  const d2 = await createDesign({
    productType: "test",
    title: "second design",
    userId: user.id,
  });

  const testCases = [
    {
      title: "checkout",
      d1Step: ApprovalStepType.TECHNICAL_DESIGN,
      d2Step: ApprovalStepType.CHECKOUT,
      filterStep: ApprovalStepType.CHECKOUT,
      expectedId: d2.id,
    },
    {
      title: "technical design",
      d1Step: ApprovalStepType.TECHNICAL_DESIGN,
      d2Step: ApprovalStepType.CHECKOUT,
      filterStep: ApprovalStepType.TECHNICAL_DESIGN,
      expectedId: d1.id,
    },
    {
      title: "sample",
      d1Step: ApprovalStepType.TECHNICAL_DESIGN,
      d2Step: ApprovalStepType.SAMPLE,
      filterStep: ApprovalStepType.SAMPLE,
      expectedId: d2.id,
    },
    {
      title: "production",
      d1Step: ApprovalStepType.TECHNICAL_DESIGN,
      d2Step: ApprovalStepType.PRODUCTION,
      filterStep: ApprovalStepType.PRODUCTION,
      expectedId: d2.id,
    },
  ];

  const allTypes = [
    ApprovalStepType.CHECKOUT,
    ApprovalStepType.TECHNICAL_DESIGN,
    ApprovalStepType.SAMPLE,
    ApprovalStepType.PRODUCTION,
  ];

  for (const testCase of testCases) {
    for (const type of allTypes) {
      await db.transaction(async (trx: Knex.Transaction) => {
        const d1Step = await ApprovalStepsDAO.findOne(trx, {
          type,
          designId: d1.id,
        });
        const d2Step = await ApprovalStepsDAO.findOne(trx, {
          type,
          designId: d2.id,
        });
        if (!d1Step || !d2Step) {
          throw new Error(`Could't find a step ${type} for generated design`);
        }
        await ApprovalStepsDAO.update(
          trx,
          d1Step.id,
          type === testCase.d1Step
            ? {
                state: ApprovalStepState.CURRENT,
                startedAt: new Date(),
                reason: null,
              }
            : {
                state: ApprovalStepState.UNSTARTED,
                startedAt: null,
                reason: null,
              }
        );
        await ApprovalStepsDAO.update(
          trx,
          d2Step.id,
          type === testCase.d2Step
            ? {
                state: ApprovalStepState.CURRENT,
                startedAt: new Date(),
                reason: null,
              }
            : {
                state: ApprovalStepState.UNSTARTED,
                startedAt: null,
                reason: null,
              }
        );
      });
    }

    const designs = await findAllDesignsThroughCollaboratorAndTeam({
      userId: user.id,
      filters: [{ type: "STEP", value: testCase.filterStep }],
    });
    t.deepEqual(
      designs.map((d: ProductDesignWithApprovalSteps) => d.id),
      [testCase.expectedId],
      testCase.title
    );
  }
});

test("findAllDesignsThroughCollaboratorAndTeam filters by stage", async (t: tape.Test) => {
  const { user } = await createUser();

  const d1 = await createDesign({
    productType: "test",
    title: "first design",
    userId: user.id,
  });
  const d2 = await createDesign({
    productType: "test",
    title: "second design",
    userId: user.id,
  });

  interface TestCase {
    title: string;
    designId: string;
    stepPatches: Partial<Record<ApprovalStepType, Partial<ApprovalStepRow>>>;
    filterStage: "COMPLETED" | "INCOMPLETE" | "CHECKED_OUT";
    expectedId: string;
  }

  const testCases: TestCase[] = [
    {
      title: "completed",
      designId: d2.id,
      stepPatches: {
        [ApprovalStepType.CHECKOUT]: {
          completed_at: new Date(),
          started_at: new Date(),
          reason: null,
          state: ApprovalStepState.COMPLETED,
        },
        [ApprovalStepType.TECHNICAL_DESIGN]: {
          completed_at: new Date(),
          started_at: new Date(),
          reason: null,
          state: ApprovalStepState.COMPLETED,
        },
        [ApprovalStepType.SAMPLE]: {
          completed_at: new Date(),
          started_at: new Date(),
          reason: null,
          state: ApprovalStepState.COMPLETED,
        },
        [ApprovalStepType.PRODUCTION]: {
          completed_at: new Date(),
          started_at: new Date(),
          reason: null,
          state: ApprovalStepState.COMPLETED,
        },
      },
      filterStage: "COMPLETED",
      expectedId: d2.id,
    },
    {
      title: "incomplete",
      designId: d2.id,
      stepPatches: {
        [ApprovalStepType.CHECKOUT]: {
          completed_at: new Date(),
          started_at: new Date(),
          reason: null,
          state: ApprovalStepState.COMPLETED,
        },
        [ApprovalStepType.TECHNICAL_DESIGN]: {
          completed_at: new Date(),
          started_at: new Date(),
          reason: null,
          state: ApprovalStepState.COMPLETED,
        },
        [ApprovalStepType.SAMPLE]: {
          completed_at: new Date(),
          started_at: new Date(),
          reason: null,
          state: ApprovalStepState.COMPLETED,
        },
        [ApprovalStepType.PRODUCTION]: {
          completed_at: new Date(),
          started_at: new Date(),
          reason: null,
          state: ApprovalStepState.COMPLETED,
        },
      },
      filterStage: "INCOMPLETE",
      expectedId: d1.id,
    },
    {
      title: "checked_out",
      designId: d2.id,
      stepPatches: {
        [ApprovalStepType.CHECKOUT]: {
          completed_at: new Date(),
          started_at: new Date(),
          reason: null,
          state: ApprovalStepState.COMPLETED,
        },
      },
      filterStage: "CHECKED_OUT",
      expectedId: d2.id,
    },
  ];

  for (const testCase of testCases) {
    await db.transaction(async (trx: Knex.Transaction) => {
      const types = Object.keys(
        testCase.stepPatches
      ) as (keyof typeof testCase.stepPatches)[];
      for (const type of types) {
        const patch = testCase.stepPatches[type];
        if (!patch) {
          continue;
        }
        const step = await ApprovalStepsDAO.findOne(trx, {
          type,
          designId: testCase.designId,
        });
        if (!step) {
          throw new Error(`Could't find a step ${type} for generated design`);
        }
        await trx(ApprovalStepsDAO.tableName)
          .where({ id: step.id })
          .update(patch);
      }
    });

    const designs = await findAllDesignsThroughCollaboratorAndTeam({
      userId: user.id,
      filters: [{ type: "STAGE", value: testCase.filterStage }],
    });
    t.deepEqual(
      designs.map((d: ProductDesignWithApprovalSteps) => d.id),
      [testCase.expectedId],
      testCase.title
    );
  }
});

test("findAllDesignsThroughCollaboratorAndTeam find designs through a team", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: partner } = await createUser({ withSession: false });
  const { user: deletedTeamUser } = await createUser({ withSession: false });
  const { user: teamPartner } = await createUser({ withSession: false });
  const { team } = await generateTeam(partner.id, { type: TeamType.PARTNER });
  await db.transaction(async (trx: Knex.Transaction) => {
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      teamId: team.id,
      userId: deletedTeamUser.id,
      userEmail: null,
      role: TeamUserRole.VIEWER,
      label: null,
      createdAt: new Date(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      teamId: team.id,
      userId: teamPartner.id,
      userEmail: null,
      role: TeamUserRole.TEAM_PARTNER,
      label: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
  });

  const { collection } = await generateCollection({
    createdBy: user.id,
  });
  const designOne = await createDesign({
    productType: "test",
    title: "rad design",
    userId: user.id,
  });

  const designTwo = await createDesign({
    productType: "test",
    title: "cool design",
    userId: user.id,
  });
  await addDesign(collection.id, designTwo.id);

  await generateCollaborator({
    collectionId: null,
    designId: designOne.id,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: null,
    teamId: team.id,
  });

  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: null,
    teamId: team.id,
  });

  const designs = await findAllDesignsThroughCollaboratorAndTeam({
    userId: partner.id,
  });
  t.deepEqual(
    designs.map((d: ProductDesignWithApprovalSteps) => d.id),
    [designTwo.id, designOne.id],
    "Returns designs for team collaborator"
  );

  const forTeamPartner = await findAllDesignsThroughCollaboratorAndTeam({
    userId: teamPartner.id,
  });
  t.deepEqual(
    forTeamPartner.map((d: ProductDesignWithApprovalSteps) => d.id),
    [designTwo.id, designOne.id],
    "Returns designs for team partner"
  );

  const forDeletedTeamUser = await findAllDesignsThroughCollaboratorAndTeam({
    userId: deletedTeamUser.id,
  });
  t.deepEqual(
    forDeletedTeamUser,
    [],
    "Does not find the team designs for a the deleted team user"
  );
});

test("findById returns approval steps", async (t: tape.Test) => {
  const { user } = await createUser();

  const design = await createDesign({
    productType: "test",
    title: "design",
    userId: user.id,
  });

  const found = await findById(design.id);

  t.deepEqual(found!.approvalSteps!.length, 4);
  t.deepEqual(found!.approvalSteps![1].state, "BLOCKED");
});

test("findDesignByAnnotationId", async (t: tape.Test) => {
  const userOne = await createUser({ withSession: false });
  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id,
  });
  const designOne = await createDesign({
    productType: "test",
    title: "design",
    userId: userOne.user.id,
  });
  await addDesign(collectionOne.id, designOne.id);
  const { canvas: canvasOne } = await generateCanvas({
    designId: designOne.id,
  });
  const { annotation: annotationOne } = await generateAnnotation({
    canvasId: canvasOne.id,
  });

  const design = await findDesignByAnnotationId(annotationOne.id);

  if (!design) {
    throw new Error("Design is not found!");
  }

  t.equal(
    designOne.id,
    design.id,
    "Returns the design that is a parent to the annotation"
  );

  await deleteAnnotation(annotationOne.id);
  const designTwo = await findDesignByAnnotationId(annotationOne.id);
  t.equal(
    designTwo,
    null,
    "Returns null if a resource in the chain was deleted"
  );
});

test("findDesignByTaskId stage task", async (t: tape.Test) => {
  const userOne = await createUser({ withSession: false });
  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id,
  });
  const designOne = await createDesign({
    productType: "test",
    title: "design",
    userId: userOne.user.id,
  });
  await addDesign(collectionOne.id, designOne.id);
  const { stage: stageOne } = await generateProductDesignStage({
    designId: designOne.id,
  });
  const { task: taskOne } = await generateTask({ designStageId: stageOne.id });

  const design = await findDesignByTaskId(taskOne.id);

  if (!design) {
    throw new Error("Design is not found!");
  }

  t.equal(
    designOne.id,
    design.id,
    "Returns the design that is a parent to the annotation"
  );

  await deleteById(designOne.id);
  const designTwo = await findDesignByTaskId(taskOne.id);
  t.equal(
    designTwo,
    null,
    "Returns null if a resource in the chain was deleted"
  );
});

test("findDesignByTaskId approval step task", async (t: tape.Test) => {
  const userOne = await createUser({ withSession: false });
  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id,
  });
  const designOne = await createDesign({
    productType: "test",
    title: "design",
    userId: userOne.user.id,
  });
  await addDesign(collectionOne.id, designOne.id);
  const { approvalStep } = await db.transaction((trx: Knex.Transaction) =>
    generateApprovalStep(trx, {
      designId: designOne.id,
    })
  );

  const task = await createTask(uuid.v4());
  await db.transaction((trx: Knex.Transaction) =>
    createApprovalTask(trx, {
      taskId: task.id,
      approvalStepId: approvalStep.id,
    })
  );
  const design = await findDesignByTaskId(task.id);

  if (!design) {
    throw new Error("Design is not found!");
  }

  t.equal(
    designOne.id,
    design.id,
    "Returns the design that is a parent to the annotation"
  );

  await deleteById(designOne.id);
  const designTwo = await findDesignByTaskId(task.id);
  t.equal(
    designTwo,
    null,
    "Returns null if a resource in the chain was deleted"
  );
});

test("findDesignByApprovalStepId", async (t: tape.Test) => {
  const userOne = await createUser({ withSession: false });
  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id,
  });
  const designOne = await createDesign({
    productType: "test",
    title: "design",
    userId: userOne.user.id,
  });
  await addDesign(collectionOne.id, designOne.id);

  const { approvalStep } = await db.transaction((trx: Knex.Transaction) =>
    generateApprovalStep(trx, {
      designId: designOne.id,
    })
  );
  const design = await findDesignByApprovalStepId(approvalStep.id);

  if (!design) {
    throw new Error("Design is not found!");
  }

  t.equal(
    designOne.id,
    design.id,
    "Returns the design that is a parent to the approval step"
  );
});

test("findAllWithCostsAndEvents base cases", async (t: tape.Test) => {
  const { user: u1 } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({ createdBy: u1.id });
  const { collection: c2 } = await generateCollection({ createdBy: u1.id });
  const d1 = await createDesign({
    productType: "TEESHIRT",
    title: "d1",
    userId: u1.id,
  });
  const d2 = await createDesign({
    productType: "PANTS",
    title: "d2",
    userId: u1.id,
  });
  await addDesign(c1.id, d1.id);

  const results = await findAllWithCostsAndEvents([c1.id]);
  t.deepEqual(
    results,
    [
      {
        ...omit(d1, "collectionIds", "collections", "imageIds", "imageLinks"),
        collectionId: c1.id,
        costInputs: [],
        events: [],
        previewImageUrls: null,
      },
    ],
    "Returns the design with no events or cost inputs"
  );

  const results2 = await findAllWithCostsAndEvents([c2.id]);
  t.deepEqual(results2, [], "Returns an empty list if there are no designs");

  await addDesign(c1.id, d2.id);
  const results3 = await findAllWithCostsAndEvents([c1.id]);
  t.deepEqual(
    results3,
    [
      {
        ...omit(d2, "collectionIds", "collections", "imageIds", "imageLinks"),
        collectionId: c1.id,
        costInputs: [],
        events: [],
        previewImageUrls: null,
      },
      {
        ...omit(d1, "collectionIds", "collections", "imageIds", "imageLinks"),
        collectionId: c1.id,
        costInputs: [],
        events: [],
        previewImageUrls: null,
      },
    ],
    "Returns the design with no events or cost inputs"
  );
});

test("findAllWithCostsAndEvents +1 case", async (t: tape.Test) => {
  await generatePricingValues();

  const { user: u1 } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({ createdBy: u1.id });
  const d1 = await createDesign({
    productType: "TEESHIRT",
    title: "d1",
    userId: u1.id,
  });
  const d2 = await createDesign({
    productType: "PANTALOONES",
    title: "d2",
    userId: u1.id,
  });
  await addDesign(c1.id, d1.id);
  await addDesign(c1.id, d2.id);

  const { designEvent: de1 } = await generateDesignEvent({
    createdAt: new Date("2019-04-20"),
    designId: d1.id,
    type: "SUBMIT_DESIGN",
  });
  const { designEvent: de2 } = await generateDesignEvent({
    createdAt: new Date("2019-04-20"),
    designId: d2.id,
    type: "SUBMIT_DESIGN",
  });
  const { designEvent: de3 } = await generateDesignEvent({
    createdAt: new Date("2019-04-21"),
    designId: d2.id,
    type: "COMMIT_COST_INPUTS",
  });
  const { pricingCostInput: ci1 } = await generatePricingCostInput({
    designId: d2.id,
  });

  const results = await findAllWithCostsAndEvents([c1.id]);

  t.equal(results.length, 2, "Returns the two designs");

  // First Item
  t.deepEqual(
    omit(results[0], "costInputs", "events"),
    {
      ...omit(d2, "collectionIds", "collections", "imageIds", "imageLinks"),
      collectionId: c1.id,
      previewImageUrls: null,
    },
    "Returns the latest made design first"
  );
  t.equal(results[0].events.length, 2, "Returns the two design events");
  t.deepEqual(
    {
      ...results[0].events[0],
      createdAt: new Date(results[0].events[0].createdAt),
    },
    de2,
    "Returns the oldest design event first"
  );
  t.deepEqual(
    {
      ...results[0].events[1],
      createdAt: new Date(results[0].events[1].createdAt),
    },
    de3,
    "Returns the newest design event last"
  );
  t.equal(results[0].costInputs.length, 1, "Returns a single cost input");
  t.equal(results[0].costInputs[0].id, ci1.id, "Returns the first cost input");

  // Second Item
  t.deepEqual(
    omit(results[1], "costInputs", "events"),
    {
      ...omit(d1, "collectionIds", "collections", "imageIds", "imageLinks"),
      collectionId: c1.id,
      previewImageUrls: null,
    },
    "Returns the first created design last"
  );
  t.deepEqual(results[1].costInputs, [], "Returns no cost inputs");
  t.deepEqual(results[1].events.length, 1, "Returns a single event");
  t.deepEqual(
    {
      ...results[1].events[0],
      createdAt: new Date(results[1].events[0].createdAt),
    },
    de1
  );
});

test("deleteByIds can delete a bunch of designs simultaneously", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const d1 = await generateDesign({ userId: user.id });
  const d2 = await generateDesign({ userId: user.id });
  const d3 = await generateDesign({ userId: user.id });

  await db.transaction(async (trx: Knex.Transaction) => {
    await deleteByIds({ designIds: [d1.id, d3.id], trx });
  });

  const designs = await findByIds([d1.id, d2.id, d3.id]);
  t.deepEqual(designs, [d2], "Only returns the only un-deleted design");
});

test("isOwner can check if the supplied user is the owner of the design", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });
  const d1 = await generateDesign({ userId: user.id });
  const d2 = await generateDesign({ userId: user2.id });

  const result1 = await isOwner({ designId: d1.id, userId: user.id });
  t.true(result1);
  const result2 = await isOwner({ designId: d1.id, userId: user2.id });
  t.false(result2);
  const result3 = await isOwner({ designId: d2.id, userId: user.id });
  t.false(result3);
  const result4 = await isOwner({ designId: d2.id, userId: user2.id });
  t.true(result4);
});

test("isOwner throws a ResourceNotFoundError if design does not exist", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  try {
    await isOwner({
      designId: "00000000-0000-0000-0000-000000000000",
      userId: user.id,
    });
    throw new Error("Shouldn't get here");
  } catch (err) {
    t.equal(err instanceof ResourceNotFoundError, true);
  }
});

test("findById attached bidId for partners", async (t: tape.Test) => {
  const {
    user: { designer },
    collectionDesigns: [design],
    quotes: [partnerRemovedQuote],
  } = await checkout();
  const { user: partner } = await createUser({
    withSession: false,
    role: "PARTNER",
  });
  const { bid: partnerRemovedBid } = await generateBid({
    quoteId: partnerRemovedQuote.id,
    designId: design.id,
    userId: partner.id,
  });

  await generateDesignEvent({
    actorId: partner.id,
    designId: design.id,
    type: "ACCEPT_SERVICE_BID",
    bidId: partnerRemovedBid.id,
    quoteId: partnerRemovedQuote.id,
  });
  await generateDesignEvent({
    actorId: designer.user.id,
    targetId: partner.id,
    designId: design.id,
    type: "REMOVE_PARTNER",
    bidId: partnerRemovedBid.id,
    quoteId: partnerRemovedQuote.id,
  });
  const foundPartnerRemovedDesign = await findById(design.id, null, {
    bidUserId: partner.id,
  });
  if (!foundPartnerRemovedDesign) {
    throw new Error("Cannot find Design!");
  }
  t.equal(
    foundPartnerRemovedDesign.bidId,
    null,
    "Retrieves null for bid Id with removed partner"
  );

  const { bid, quote } = await generateBid({
    designId: design.id,
    userId: partner.id,
  });
  await generateDesignEvent({
    actorId: partner.id,
    designId: design.id,
    type: "ACCEPT_SERVICE_BID",
    bidId: bid.id,
    quoteId: quote.id,
  });

  const foundPairedDesign = await findById(design.id, null, {
    bidUserId: partner.id,
  });
  if (!foundPairedDesign) {
    throw new Error("Cannot find Design!");
  }
  t.equal(foundPairedDesign.bidId, bid.id, "Retrieves the correct bid id");
});

test("findAllDesignsThroughCollaboratorAndTeam attaches bid id", async (t: tape.Test) => {
  const {
    user: { designer },
    collectionDesigns: [design],
    quotes: [partnerRemovedQuote],
  } = await checkout();
  const { user: partner } = await createUser({
    withSession: false,
    role: "PARTNER",
  });
  const { bid: partnerRemovedBid } = await generateBid({
    quoteId: partnerRemovedQuote.id,
    designId: design.id,
    userId: partner.id,
  });
  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: partner.id,
  });

  await generateDesignEvent({
    actorId: partner.id,
    designId: design.id,
    type: "ACCEPT_SERVICE_BID",
    bidId: partnerRemovedBid.id,
    quoteId: partnerRemovedQuote.id,
  });
  await generateDesignEvent({
    actorId: designer.user.id,
    targetId: partner.id,
    designId: design.id,
    type: "REMOVE_PARTNER",
    bidId: partnerRemovedBid.id,
    quoteId: partnerRemovedQuote.id,
  });
  const [
    foundPartnerRemovedDesign,
  ] = await findAllDesignsThroughCollaboratorAndTeam({
    userId: partner.id,
    role: "PARTNER",
  });
  if (!foundPartnerRemovedDesign) {
    throw new Error("Cannot find Design!");
  }
  t.equal(
    foundPartnerRemovedDesign.bidId,
    null,
    "Retrieves null for bid Id with removed partner"
  );

  const { bid, quote } = await generateBid({
    designId: design.id,
    userId: partner.id,
  });
  await generateDesignEvent({
    actorId: partner.id,
    designId: design.id,
    type: "ACCEPT_SERVICE_BID",
    bidId: bid.id,
    quoteId: quote.id,
  });

  const [foundPairedDesign] = await findAllDesignsThroughCollaboratorAndTeam({
    userId: partner.id,
    role: "PARTNER",
  });
  if (!foundPairedDesign) {
    throw new Error("Cannot find Design!");
  }
  t.equal(foundPairedDesign.bidId, bid.id, "Retrieves the correct bid id");
});

test("findAllDesignsThroughCollaboratorAndTeam finds team designs and assigns correct permissions", async (t: tape.Test) => {
  const { user: owner } = await createUser({ withSession: false });
  const { user: viewer } = await createUser({ withSession: false });
  const { user: editor } = await createUser({ withSession: false });

  const design = await generateDesign({ userId: owner.id });
  const { team } = await generateTeam(owner.id);
  const { collection } = await generateCollection({
    createdBy: owner.id,
    teamId: team.id,
  });
  await addDesign(collection.id, design.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      teamId: team.id,
      userId: viewer.id,
      userEmail: null,
      role: TeamUserRole.VIEWER,
      label: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      teamId: team.id,
      userId: editor.id,
      userEmail: null,
      role: TeamUserRole.EDITOR,
      label: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
  });

  const viewerDesigns = await findAllDesignsThroughCollaboratorAndTeam({
    userId: viewer.id,
  });
  t.equal(viewerDesigns.length, 1, "Returns the only design");
  t.deepEqual(
    viewerDesigns[0].collaboratorRoles,
    ["VIEW"],
    "view collaborator role is correctly set"
  );
  const editorDesigns = await findAllDesignsThroughCollaboratorAndTeam({
    userId: editor.id,
  });
  t.equal(editorDesigns.length, 1, "Returns the only design");
  t.deepEqual(
    editorDesigns[0].collaboratorRoles,
    ["EDIT"],
    "edit collaborator role is correctly set"
  );
});

test("getTitleAndOwnerByShipmentTracking", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const trx = await db.transaction();
  try {
    const d1 = await createDesign(
      staticProductDesign({
        userId: user.id,
        title: "A great title",
      }),
      trx
    );
    const checkoutStep = await ApprovalStepsDAO.findOne(trx, {
      designId: d1.id,
      type: ApprovalStepType.CHECKOUT,
    });

    if (!checkoutStep) {
      throw new Error("Could not find checkout step for created design");
    }

    sandbox().stub(Aftership, "createTracking").resolves({
      aftershipTracking: {},
      updates: [],
    });
    sandbox().stub(Aftership, "getTracking").resolves({
      aftershipTracking: {},
      updates: [],
    });

    const shipmentTracking = await ShipmentTrackingsDAO.create(trx, {
      approvalStepId: checkoutStep.id,
      courier: "usps",
      createdAt: new Date(2012, 11, 23),
      description: "First",
      id: uuid.v4(),
      trackingId: "first-tracking-id",
      deliveryDate: null,
      expectedDelivery: null,
    });

    t.deepEqual(
      await getTitleAndOwnerByShipmentTracking(trx, shipmentTracking.id),
      {
        designId: d1.id,
        designTitle: "A great title",
        designerName: user.name,
        designerId: user.id,
        collectionId: null,
      },
      "returns design title and designer name"
    );

    t.deepEqual(
      await getTitleAndOwnerByShipmentTracking(trx, uuid.v4()),
      null,
      "returns null for a miss"
    );
  } finally {
    await trx.rollback();
  }
});

test("findIdByQuoteId", async (t: Test) => {
  const {
    collectionDesigns: [design],
    quotes: [quote],
  } = await checkout();

  t.equal(
    await db.transaction((trx: Knex.Transaction) =>
      findIdByQuoteId(trx, quote.id)
    ),
    design.id,
    "returns correct design ID"
  );

  t.equal(
    await db.transaction((trx: Knex.Transaction) =>
      findIdByQuoteId(trx, uuid.v4())
    ),
    null,
    "returns null for a miss"
  );
});

test("findPaidDesigns", async (t: Test) => {
  const {
    collectionDesigns: [design0, design1],
  } = await checkout();

  const paid = await db.transaction((trx: Knex.Transaction) =>
    findPaidDesigns(trx)
  );

  t.equal(paid.length, 2, "Returns paid designs");
  t.equal(paid[0].id, design1.id, "Returns paid designs in descending order");
  t.equal(paid[1].id, design0.id, "Returns paid designs in descending order");

  const limitOffset = await db.transaction((trx: Knex.Transaction) =>
    findPaidDesigns(trx, { limit: 1, offset: 1 })
  );

  t.equal(limitOffset.length, 1, "Limits results");
  t.equal(limitOffset[0].id, design0.id, "Offsets results");
});

test("findPaidDesigns allows filtering by product type", async (t: Test) => {
  await checkout();

  const paid = await db.transaction((trx: Knex.Transaction) =>
    findPaidDesigns(trx, { productType: "TEESHIRT" })
  );

  t.equal(paid.length, 2, "Returns paid designs");

  const empty = await db.transaction((trx: Knex.Transaction) =>
    findPaidDesigns(trx, { productType: "DRESS" })
  );

  t.equal(empty.length, 0, "Does not find non-matching products");
});

test("findMinimalByIds", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const design0 = await generateDesign({
    userId: user.id,
    createdAt: new Date(2012, 11, 24),
  });
  const design1 = await generateDesign({
    userId: user.id,
    createdAt: new Date(2012, 11, 25),
  });

  t.deepEqual(
    await findMinimalByIds([design0.id, design1.id]),
    [
      {
        title: design1.title,
        id: design1.id,
        created_at: design1.createdAt,
        user_id: design1.userId,
      },
      {
        title: design0.title,
        id: design0.id,
        created_at: design0.createdAt,
        user_id: design0.userId,
      },
    ],
    "finds minimal version of each design"
  );

  try {
    await findMinimalByIds([design0.id, uuid.v4()]);
    t.fail("should not get here");
  } catch (err) {
    t.deepEqual(
      err,
      new Error("Query returned different number of rows than requested"),
      "throws correct error"
    );
  }
});

test("create", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const trx = await db.transaction();
  try {
    const created = await create(trx, "A design", user.id);

    t.equal(created.title, "A design", "sets the title");
    t.equal(created.userId, user.id, "sets the userId");
  } finally {
    await trx.rollback();
  }
});

test("findBaseById", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await generateDesign(({
    userId: user.id,
    previewImageUrls: null,
  } as unknown) as Partial<ProductDesign>);

  t.deepEqual(
    await findBaseById(db, design.id),
    {
      ...omit(design, "collectionIds", "collections", "imageIds", "imageLinks"),
      previewImageUrls: [],
    },
    "finds existing design"
  );

  const wrongId = uuid.v4();
  try {
    await findBaseById(db, wrongId);
    t.fail("should not get here");
  } catch (err) {
    t.deepEqual(
      err,
      new ResourceNotFoundError(`Design #${wrongId} not found`),
      "throws correct error"
    );
  }
});
