'use strict';

const pick = require('lodash/pick');
const Router = require('koa-router');

const canAccessSection = require('../../../middleware/can-access-section');
const canAccessUserResource = require('../../../middleware/can-access-user-resource');
const CollaboratorsDAO = require('../../collaborators/dao');
const CollectionsDAO = require('../../collections/dao');
const filterError = require('../../../services/filter-error');
const InvalidDataError = require('../../../errors/invalid-data');
const MissingPrerequisitesError = require('../../../errors/missing-prerequisites');
const PricingCalculator = require('../../../services/pricing-table');
const ProductDesignsDAO = require('../dao');
const ProductDesignStatusesDAO = require('../../../dao/product-design-statuses');
const ProductDesignStatusSlasDAO = require('../../../dao/product-design-status-slas');
const TaskEventsDAO = require('../../../dao/task-events');
const ProductDesignStagesDAO = require('../../../dao/product-design-stages');
const requireAuth = require('../../../middleware/require-auth');
const createDesign = require('../../../services/create-design').default;
const User = require('../../users/domain-object');
const UsersDAO = require('../../users/dao');
const {
  canAccessDesignInParam,
  canAccessDesignsInQuery,
  canCommentOnDesign,
  canDeleteDesign,
  canDeleteDesigns
} = require('../../../middleware/can-access-design');
const { requireValues } = require('../../../services/require-properties');
const { getDesignPermissions } = require('../../../services/get-permissions');
const { deleteDesign, deleteDesigns } = require('./deletion');

const {
  getDesignUploadPolicy,
  getThumbnailUploadPolicy
} = require('./upload-policy');
const {
  addDesignEvent,
  addDesignEvents,
  getDesignEvents
} = require('./events');
const { updateAllNodes } = require('./phidias');
const {
  getSections,
  createSection,
  deleteSectionId,
  updateSection,
  getSectionFeaturePlacements,
  replaceSectionFeaturePlacements,
  getSectionAnnotations,
  createSectionAnnotation
} = require('./sections');
const { findAllDesignsThroughCollaborator } = require('../dao/dao');
const { createFromTemplate } = require('./templates');

const router = new Router();

const ALLOWED_DESIGN_PARAMS = [
  'description',
  'previewImageUrls',
  'metadata',
  'productType',
  'title',
  'retailPriceCents',
  'dueDate',
  'expectedCostCents'
];
const ADMIN_ALLOWED_DESIGN_PARAMS = [
  ...ALLOWED_DESIGN_PARAMS,
  'overridePricingTable',
  'showPricingBreakdown'
];

async function attachDesignOwner(design) {
  const owner = await UsersDAO.findById(design.userId);
  design.setOwner(owner);
  return design;
}

async function attachStatuses(design) {
  const status = await ProductDesignStatusesDAO.findById(design.status);

  const sla = await ProductDesignStatusSlasDAO.findByDesignAndStatus(
    design.id,
    design.status
  );

  if (sla) {
    status.setSla(sla);
  }

  design.setCurrentStatus(status);

  if (status.nextStatus) {
    const nextStatus = await ProductDesignStatusesDAO.findById(
      status.nextStatus
    );
    design.setNextStatus(nextStatus);
  }

  return design;
}

async function attachRole(requestorId, design) {
  const requestorAsCollaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    requestorId
  );

  if (!requestorAsCollaborator) {
    return design;
  }

  design.setRole(requestorAsCollaborator.role);
  return design;
}

async function attachResources(design, requestorId, permissions) {
  requireValues({ design, permissions });

  let attached = design;
  attached = await attachDesignOwner(attached);
  attached = await attachStatuses(attached);
  attached = await attachRole(requestorId, attached);
  attached.setPermissions(permissions);
  return attached;
}

function* getDesignsByUser() {
  const { role, userId } = this.state;
  canAccessUserResource.call(this, this.query.userId);
  const designs = yield findAllDesignsThroughCollaborator({
    userId: this.query.userId,
    limit: this.query.limit,
    offset: this.query.offset,
    search: this.query.search
  });
  const designsWithPermissions = yield Promise.all(
    designs.map(async design => {
      const designPermissions = await getDesignPermissions(
        design,
        role,
        userId
      );
      return { ...design, permissions: designPermissions };
    })
  );

  this.body = designsWithPermissions;
  this.status = 200;
}

function* attachAssignees(task) {
  const ioFromTaskEvent = (taskEvent, assignees) => {
    return {
      ...taskEvent,
      assignees
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
    tasks: tasksAndAssignees
  };
}

function* attachStages(design) {
  const stages = yield ProductDesignStagesDAO.findAllByDesignId(design.id);
  const stagesAndTasks = yield stages.map(attachTasks);
  return {
    ...design,
    stages: stagesAndTasks
  };
}

function* attachTasksToDesigns(designs) {
  const attached = yield designs.map(attachStages);
  return attached;
}

function* getDesignsAndTasksByUser() {
  const { role, userId } = this.state;
  canAccessUserResource.call(this, this.query.userId);

  const designs = yield findAllDesignsThroughCollaborator({
    userId: this.query.userId
  });

  // TODO: this could end up making 100s of queries to the db, this could be improved by using
  //       one large JOIN
  const designsAndTasks = yield attachTasksToDesigns(designs);
  const designsWithPermissions = yield Promise.all(
    designsAndTasks.map(async design => {
      const permissions = await getDesignPermissions(design, role, userId);
      return { ...design, permissions };
    })
  );

  this.body = designsWithPermissions;
  this.status = 200;
}

function* getAllDesigns() {
  const { role, userId } = this.state;
  this.assert(this.state.role === User.ROLES.admin, 403);

  const designs = yield ProductDesignsDAO.findAll({
    limit: Number(this.query.limit) || 10,
    offset: Number(this.query.offset) || 0,
    search: this.query.search,
    needsQuote: Boolean(this.query.needsQuote)
  });

  const designsWithPermissions = yield Promise.all(
    designs.map(async design => {
      const permissions = await getDesignPermissions(design, role, userId);
      return attachResources(design, userId, permissions);
    })
  );

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
  } else {
    yield getAllDesigns;
  }
}

function* getDesign() {
  const { design, permissions, userId } = this.state;
  const hydratedDesign = yield attachResources(design, userId, permissions);
  this.body = hydratedDesign;
  this.status = 200;
}

// DEPRECATED: V1 Endpoint.
function* getDesignPricing() {
  const { canViewPricing, canManagePricing } = this.state.permissions;

  if (!canViewPricing) {
    this.throw(403, "You're not able to view pricing for this garment");
  }

  const design = yield ProductDesignsDAO.findById(this.params.designId);
  const calculator = new PricingCalculator(design);
  const {
    computedPricingTable,
    overridePricingTable,
    finalPricingTable
  } = yield calculator
    .getAllPricingTables()
    .catch(filterError(MissingPrerequisitesError, err => this.throw(400, err)));
  let finalTable = finalPricingTable;

  if (!canManagePricing && !design.showPricingBreakdown) {
    finalTable = finalPricingTable.serializeWithoutBreakdown();
  }

  this.body = {
    computedPricingTable: canManagePricing ? computedPricingTable : null,
    overridePricingTable: canManagePricing ? overridePricingTable : null,
    finalPricingTable: finalTable
  };

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
    filterError(InvalidDataError, err => this.throw(400, err))
  );
  const designPermissions = yield getDesignPermissions(design, role, userId);

  design = yield attachResources(design, userId, designPermissions);

  this.body = design;
  this.status = 201;
}

function* updateDesign() {
  const { permissions, role, userId } = this.state;
  const { designId } = this.params;

  const isAdmin = role === User.ROLES.admin;
  const allowedParams = isAdmin
    ? ADMIN_ALLOWED_DESIGN_PARAMS
    : ALLOWED_DESIGN_PARAMS;
  const data = pick(this.request.body, allowedParams);

  let updated = yield ProductDesignsDAO.update(designId, data).catch(
    filterError(InvalidDataError, err => this.throw(400, err))
  );
  updated = yield attachResources(updated, userId, permissions);

  this.body = updated;
  this.status = 200;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, getDesigns);
router.del(
  '/',
  requireAuth,
  canAccessDesignsInQuery,
  canDeleteDesigns,
  deleteDesigns
);
router.del(
  '/:designId',
  requireAuth,
  canAccessDesignInParam,
  canDeleteDesign,
  deleteDesign
);
router.get('/:designId', requireAuth, canAccessDesignInParam, getDesign);
router.patch('/:designId', requireAuth, canAccessDesignInParam, updateDesign);
router.get(
  '/:designId/pricing',
  requireAuth,
  canAccessDesignInParam,
  getDesignPricing
);
router.get(
  '/:designId/collections',
  requireAuth,
  canAccessDesignInParam,
  getDesignCollections
);

router.get(
  '/:designId/upload-policy/:sectionId',
  requireAuth,
  canAccessDesignInParam,
  getThumbnailUploadPolicy
);
router.get('/upload-policy/:id', requireAuth, getDesignUploadPolicy);

router.get(
  '/:designId/events',
  requireAuth,
  canAccessDesignInParam,
  getDesignEvents
);
router.post(
  '/:designId/events',
  requireAuth,
  canAccessDesignInParam,
  addDesignEvents
);
router.put(
  '/:designId/events/:eventId',
  requireAuth,
  canAccessDesignInParam,
  addDesignEvent
);

router.get(
  '/:designId/sections',
  requireAuth,
  canAccessDesignInParam,
  getSections
);
router.post(
  '/:designId/sections',
  requireAuth,
  canAccessDesignInParam,
  createSection
);
router.del(
  '/:designId/sections/:sectionId',
  requireAuth,
  canAccessDesignInParam,
  deleteSectionId
);
router.patch(
  '/:designId/sections/:sectionId',
  requireAuth,
  canAccessDesignInParam,
  canAccessSection,
  updateSection
);
router.get(
  '/:designId/sections/:sectionId/annotations',
  requireAuth,
  canAccessDesignInParam,
  canAccessSection,
  getSectionAnnotations
);
router.post(
  '/:designId/sections/:sectionId/annotations',
  requireAuth,
  canAccessDesignInParam,
  canCommentOnDesign,
  canAccessSection,
  createSectionAnnotation
);
router.get(
  '/:designId/sections/:sectionId/feature-placements',
  requireAuth,
  canAccessDesignInParam,
  canAccessSection,
  getSectionFeaturePlacements
);
router.put(
  '/:designId/sections/:sectionId/feature-placements',
  requireAuth,
  canAccessDesignInParam,
  canAccessSection,
  replaceSectionFeaturePlacements
);
router.put('/:designId', requireAuth, canAccessDesignInParam, updateAllNodes);
router.post('/templates/:templateDesignId', requireAuth, createFromTemplate);

module.exports = router.routes();
