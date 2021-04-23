"use strict";

const pick = require("lodash/pick");
const Router = require("koa-router");

const canAccessUserResource = require("../../../middleware/can-access-user-resource");
const CollaboratorsDAO = require("../../collaborators/dao");
const CollectionsDAO = require("../../collections/dao");
const filterError = require("../../../services/filter-error");
const InvalidDataError = require("../../../errors/invalid-data");
const ProductDesignsDAO = require("../dao");
const ProductDesignsDaoTs = require("../dao/dao");
const TaskEventsDAO = require("../../../dao/task-events");
const ProductDesignStagesDAO = require("../../../dao/product-design-stages");
const requireAuth = require("../../../middleware/require-auth");
const createDesign = require("../../../services/create-design").default;
const User = require("../../users/domain-object");
const UsersDAO = require("../../users/dao");
const TeamUsersDAO = require("../../team-users/dao").default;
const {
  canAccessDesignInParam,
  canAccessDesignsInQuery,
  canDeleteDesign,
  canDeleteDesigns,
} = require("../../../middleware/can-access-design");
const { requireValues } = require("../../../services/require-properties");
const {
  getDesignPermissions,
  calculateDesignPermissions,
} = require("../../../services/get-permissions");
const db = require("../../../services/db");
const { deleteDesign, deleteDesigns } = require("./deletion");
const useTransaction = require("../../../middleware/use-transaction").default;

const {
  getDesignUploadPolicy,
  getThumbnailUploadPolicy,
} = require("./upload-policy");
const { getPaidDesigns } = require("./paid");
const { updateAllNodes } = require("./phidias");
const { findAllDesignsThroughCollaboratorAndTeam } = require("../dao/dao");
const { createFromTemplate } = require("./templates");

const router = new Router();

const ALLOWED_DESIGN_PARAMS = [
  "description",
  "previewImageUrls",
  "metadata",
  "productType",
  "title",
  "retailPriceCents",
  "dueDate",
  "expectedCostCents",
  "collectionIds",
];
const ADMIN_ALLOWED_DESIGN_PARAMS = [
  ...ALLOWED_DESIGN_PARAMS,
  "overridePricingTable",
  "showPricingBreakdown",
];

async function attachDesignOwner(design, trx) {
  const owner = await UsersDAO.findById(design.userId, trx);
  design.setOwner(owner);
  return design;
}

async function attachRole(requestorId, design, trx) {
  const requestorAsCollaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    requestorId,
    trx
  );

  if (!requestorAsCollaborator) {
    return design;
  }

  design.setRole(requestorAsCollaborator.role);
  return design;
}

async function attachResources({ trx, design, requestorId, permissions }) {
  requireValues({ design, permissions });

  let attached = design;
  attached = await attachDesignOwner(attached, trx);
  attached = await attachRole(requestorId, attached, trx);
  attached.setPermissions(permissions);
  return attached;
}

function* getDesignsByUser() {
  const { role, userId } = this.state;
  canAccessUserResource.call(this, this.query.userId);
  const filters = [];
  const { collectionFilterId, teamId, currentStepType, stageType } = this.query;
  if (collectionFilterId) {
    filters.push({ type: "COLLECTION", value: collectionFilterId });
  }
  if (teamId !== undefined) {
    if (teamId === "null") {
      filters.push({ type: "TEAM", value: null });
    } else {
      const teamUser = yield db.transaction((trx) =>
        TeamUsersDAO.findOne(trx, { teamId, userId })
      );
      if (!teamUser && role !== "ADMIN") {
        this.throw(403, "Must be a member of team to search by team");
      }

      filters.push({ type: "TEAM", value: teamId });
    }
  }
  if (currentStepType) {
    filters.push({ type: "STEP", value: currentStepType });
  }
  if (stageType) {
    filters.push({ type: "STAGE", value: stageType });
  }
  const designs = yield ProductDesignsDaoTs.findAllDesignsThroughCollaboratorAndTeam(
    {
      userId: this.query.userId,
      limit: this.query.limit,
      offset: this.query.offset,
      search: this.query.search,
      sortBy: this.query.sortBy,
      role,
      filters,
    }
  );
  const designsWithPermissions = designs.map((design) => {
    const designPermissions = calculateDesignPermissions({
      sessionRole: role,
      sessionUserId: userId,
      isOwner: userId === design.userId,
      isDraftDesign: design.collections && design.collections.length === 0,
      collaboratorRoles: design.collaboratorRoles,
      teamUserRoles: design.teamRoles,
      isDesignCheckedOut: design.isCheckedOut,
    });
    return { ...design, permissions: designPermissions };
  });

  this.body = designsWithPermissions;
  this.status = 200;
}

function* attachAssignees(task) {
  const ioFromTaskEvent = (taskEvent, assignees) => {
    return {
      ...taskEvent,
      assignees,
    };
  };
  const assignees = yield CollaboratorsDAO.findByTask(task.id);
  return ioFromTaskEvent(task, assignees);
}

function* attachTasks(stage) {
  const tasks = yield TaskEventsDAO.findByStageId(stage.id);
  const tasksAndAssignees = yield tasks.map(attachAssignees);
  return {
    ...stage,
    tasks: tasksAndAssignees,
  };
}

function* attachStages(design) {
  const stages = yield ProductDesignStagesDAO.findAllByDesignId(design.id);
  const stagesAndTasks = yield stages.map(attachTasks);
  return {
    ...design,
    stages: stagesAndTasks,
  };
}

function* attachTasksToDesigns(designs) {
  const attached = yield designs.map(attachStages);
  return attached;
}

function* getDesignsAndTasksByUser() {
  const { role, userId } = this.state;
  canAccessUserResource.call(this, this.query.userId);

  const designs = yield findAllDesignsThroughCollaboratorAndTeam({
    userId: this.query.userId,
  });

  // TODO: this could end up making 100s of queries to the db, this could be improved by using
  //       one large JOIN
  const designsAndTasks = yield attachTasksToDesigns(designs);
  const designsWithPermissions = [];

  for (const design of designsAndTasks) {
    const permissions = yield getDesignPermissions({
      designId: design.id,
      sessionRole: role,
      sessionUserId: userId,
    });
    designsWithPermissions.push({ ...design, permissions });
  }

  this.body = designsWithPermissions;
  this.status = 200;
}

function* getAllDesigns() {
  const { role, userId } = this.state;
  this.assert(this.state.role === User.ROLES.ADMIN, 403);

  const designs = yield ProductDesignsDAO.findAll({
    limit: Number(this.query.limit) || 10,
    offset: Number(this.query.offset) || 0,
    search: this.query.search,
    needsQuote: Boolean(this.query.needsQuote),
  });

  const designsWithPermissions = [];

  for (const design of designs) {
    const permissions = yield getDesignPermissions({
      designId: design.id,
      sessionRole: role,
      sessionUserId: userId,
    });
    designsWithPermissions.push(
      yield attachResources({ design, requestorId: userId, permissions })
    );
  }

  this.body = designsWithPermissions;
  this.status = 200;
}

function* getDesigns() {
  if (this.query.userId) {
    if (this.query.tasks) {
      yield getDesignsAndTasksByUser;
    } else {
      yield getDesignsByUser;
    }
  } else if (this.query.paid === "true") {
    yield getPaidDesigns;
  } else {
    yield getAllDesigns;
  }
}

function* getDesign() {
  const { permissions, userId, role } = this.state;
  const design =
    role === "PARTNER"
      ? yield ProductDesignsDAO.findById(this.params.designId, undefined, {
          bidUserId: userId,
        })
      : this.state.design;

  const hydratedDesign = yield attachResources({
    design,
    requestorId: userId,
    permissions,
  });
  this.body = hydratedDesign;
  this.status = 200;
}

function* getDesignCollections() {
  const collections = yield CollectionsDAO.findByDesign(this.params.designId);
  this.body = collections;
  this.status = 200;
}

function* create() {
  const { role, userId } = this.state;
  const userData = pick(this.request.body, ALLOWED_DESIGN_PARAMS);
  const data = { ...userData, userId };

  let design = yield createDesign(data).catch(
    filterError(InvalidDataError, (err) => this.throw(400, err))
  );
  const designPermissions = yield getDesignPermissions({
    designId: design.id,
    sessionRole: role,
    sessionUserId: userId,
  });

  design = yield attachResources({
    design,
    requestorId: userId,
    permissions: designPermissions,
  });

  this.body = design;
  this.status = 201;
}

function* updateDesign() {
  const { permissions, role, userId } = this.state;
  const { designId } = this.params;

  const isAdmin = role === User.ROLES.ADMIN;
  const allowedParams = isAdmin
    ? ADMIN_ALLOWED_DESIGN_PARAMS
    : ALLOWED_DESIGN_PARAMS;
  const data = pick(this.request.body, allowedParams);

  let updated = yield ProductDesignsDAO.update(designId, data).catch(
    filterError(InvalidDataError, (err) => this.throw(400, err))
  );
  updated = yield attachResources({
    design: updated,
    requestorId: userId,
    permissions,
  });

  this.body = updated;
  this.status = 200;
}

router.post("/", requireAuth, create);
router.get("/", requireAuth, getDesigns);
router.del(
  "/",
  requireAuth,
  canAccessDesignsInQuery,
  canDeleteDesigns,
  deleteDesigns
);
router.del(
  "/:designId",
  requireAuth,
  canAccessDesignInParam,
  canDeleteDesign,
  deleteDesign
);
router.get("/:designId", requireAuth, canAccessDesignInParam, getDesign);
router.patch("/:designId", requireAuth, canAccessDesignInParam, updateDesign);
router.get(
  "/:designId/collections",
  requireAuth,
  canAccessDesignInParam,
  getDesignCollections
);

router.get(
  "/:designId/upload-policy/:sectionId",
  requireAuth,
  canAccessDesignInParam,
  getThumbnailUploadPolicy
);
router.get("/upload-policy/:id", requireAuth, getDesignUploadPolicy);

router.put("/:designId", requireAuth, canAccessDesignInParam, updateAllNodes);
router.post(
  "/templates/:templateDesignId",
  requireAuth,
  useTransaction,
  createFromTemplate
);

module.exports.routes = router.routes();
module.exports.attachResources = attachResources;
