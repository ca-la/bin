'use strict';

const intersection = require('lodash/intersection');
const pick = require('lodash/pick');
const Router = require('koa-router');

const canAccessAnnotation = require('../../middleware/can-access-annotation');
const canAccessSection = require('../../middleware/can-access-section');
const canAccessUserResource = require('../../middleware/can-access-user-resource');
const CollaboratorsDAO = require('../../dao/collaborators');
const CollectionsDAO = require('../../dao/collections');
const compact = require('../../services/compact');
const filterError = require('../../services/filter-error');
const findUserDesigns = require('../../services/find-user-designs');
const getDesignPermissions = require('../../services/get-design-permissions');
const InvalidDataError = require('../../errors/invalid-data');
const MissingPrerequisitesError = require('../../errors/missing-prerequisites');
const PricingCalculator = require('../../services/pricing-table');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignStatusesDAO = require('../../dao/product-design-statuses');
const ProductDesignStatusSlasDAO = require('../../dao/product-design-status-slas');
const TaskEventsDAO = require('../../dao/task-events');
const ProductDesignStagesDAO = require('../../dao/product-design-stages');
const requireAuth = require('../../middleware/require-auth');
const updateDesignStatus = require('../../services/update-design-status');
const createDesign = require('../../services/create-design').default;
const User = require('../../domain-objects/user');
const UsersDAO = require('../../dao/users');
const { canAccessDesignInParam, canCommentOnDesign } = require('../../middleware/can-access-design');
const { requireValues } = require('../../services/require-properties');
const { sendDesignUpdateNotifications } = require('../../services/create-notifications');

const { getDesignUploadPolicy, getThumbnailUploadPolicy } = require('./upload-policy');
const { addDesignEvent, addDesignEvents, getDesignEvents } = require('./events');
const {
  getSections,
  createSection,
  deleteSectionId,
  updateSection,
  getSectionFeaturePlacements,
  replaceSectionFeaturePlacements,
  getSectionAnnotations,
  createSectionAnnotation,
  deleteSectionAnnotation,
  updateSectionAnnotation
} = require('./sections');

const router = new Router();

async function attachDesignOwner(design) {
  const owner = await UsersDAO.findById(design.userId);
  design.setOwner(owner);
  return design;
}

async function attachStatuses(design) {
  const status = await ProductDesignStatusesDAO.findById(design.status);

  const sla = await ProductDesignStatusSlasDAO.findByDesignAndStatus(design.id, design.status);

  if (sla) {
    status.setSla(sla);
  }

  design.setCurrentStatus(status);

  if (status.nextStatus) {
    const nextStatus = await ProductDesignStatusesDAO.findById(status.nextStatus);
    design.setNextStatus(nextStatus);
  }

  return design;
}

async function attachRole(requestorId, design) {
  const requestorAsCollaborator = await CollaboratorsDAO
    .findByDesignAndUser(design.id, requestorId);

  if (!requestorAsCollaborator || requestorAsCollaborator.length === 0) {
    return design;
  }

  design.setRole(requestorAsCollaborator[0].role);
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
  canAccessUserResource.call(this, this.query.userId);

  const filters = compact({ status: this.query.status });
  this.body = yield findUserDesigns(this.query.userId, filters);

  this.status = 200;
}

function* attachAssignees(task) {
  const ioFromTaskEvent = (taskEvent, assignees) => {
    return {
      assignees,
      createdAt: taskEvent.createdAt,
      createdBy: taskEvent.createdBy,
      description: taskEvent.description,
      designStageId: taskEvent.designStageId,
      dueDate: taskEvent.dueDate,
      id: taskEvent.taskId,
      status: taskEvent.status,
      title: taskEvent.title
    };
  };
  const assignees = yield CollaboratorsDAO.findByTask(task.taskId);
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
  canAccessUserResource.call(this, this.query.userId);

  const filters = compact({ status: this.query.status });
  const designs = yield findUserDesigns(this.query.userId, filters);

  // TODO: this could end up making 100s of queries to the db, this could be improved by using
  //       one large JOIN
  const designsAndTasks = yield attachTasksToDesigns(designs);

  this.body = designsAndTasks;
  this.status = 200;
}

function* getAllDesigns() {
  this.assert(this.state.role === User.ROLES.admin, 403);

  const designs = yield ProductDesignsDAO.findAll({
    limit: Number(this.query.limit) || 10,
    offset: Number(this.query.offset) || 0,
    search: this.query.search,
    needsQuote: Boolean(this.query.needsQuote)
  });

  for (const design of designs) {
    yield attachDesignOwner(design);
  }

  this.body = designs;
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
  const design = yield attachResources(
    this.state.design,
    this.state.userId,
    this.state.designPermissions
  );

  this.body = design;
  this.status = 200;
}

function* getDesignPricing() {
  const { canViewPricing, canManagePricing } = this.state.designPermissions;

  if (!canViewPricing) {
    this.throw(403, "You're not able to view pricing for this garment");
  }

  const design = yield ProductDesignsDAO.findById(this.params.designId);

  const calculator = new PricingCalculator(design);

  const {
    computedPricingTable,
    overridePricingTable,
    finalPricingTable
  } = yield calculator.getAllPricingTables()
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

function* create() {
  const userData = pick(this.request.body, ALLOWED_DESIGN_PARAMS);

  const data = Object.assign({}, userData, {
    userId: this.state.userId
  });

  let design = yield createDesign(data)
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  const designPermissions = yield getDesignPermissions(
    design,
    this.state.userId,
    this.state.role
  );

  design = yield attachResources(design, this.state.userId, designPermissions);

  this.body = design;
  this.status = 201;
}

function* updateDesign() {
  const isAdmin = (this.state.role === User.ROLES.admin);
  const allowedParams = isAdmin ? ADMIN_ALLOWED_DESIGN_PARAMS : ALLOWED_DESIGN_PARAMS;

  const data = pick(this.request.body, allowedParams);

  let updated = yield ProductDesignsDAO.update(
    this.params.designId,
    data
  )
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  updated = yield attachResources(updated, this.state.userId, this.state.designPermissions);

  const keys = Object.keys(data);

  const keysToNotifyOn = [
    'description',
    'metadata',
    'title',
    'retailPriceCents',
    'dueDate',
    'expectedCostCents'
  ];

  if (intersection(keys, keysToNotifyOn).length > 0) {
    yield sendDesignUpdateNotifications(
      this.params.designId,
      this.state.userId
    );
  }

  this.body = updated;
  this.status = 200;
}

function* deleteDesign() {
  if (!this.state.designPermissions.canDelete) {
    this.throw(403, 'Only the owner can delete this design');
  }

  yield ProductDesignsDAO.deleteById(this.params.designId);

  this.status = 204;
}

function* setStatus() {
  const { newStatus } = this.request.body;
  this.assert(newStatus, 400, 'New status must be provided');

  const { canPutStatus } = this.state.designPermissions;

  this.assert(
    canPutStatus,
    403,
    "You don't have permission to modify this design status"
  );

  const updated = yield updateDesignStatus(
    this.params.designId,
    newStatus,
    this.state.userId
  )
    .catch(filterError(InvalidDataError, err => this.throw(400, err)))
    .catch(filterError(MissingPrerequisitesError, err => this.throw(400, err)));

  this.body = { status: updated };
  this.status = 200;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, getDesigns);
router.del('/:designId', requireAuth, canAccessDesignInParam, deleteDesign);
router.get('/:designId', requireAuth, canAccessDesignInParam, getDesign);
router.patch('/:designId', requireAuth, canAccessDesignInParam, updateDesign);
router.get('/:designId/pricing', requireAuth, canAccessDesignInParam, getDesignPricing);
router.get('/:designId/collections', requireAuth, canAccessDesignInParam, getDesignCollections);
router.put('/:designId/status', requireAuth, canAccessDesignInParam, setStatus);

router.get('/:designId/upload-policy/:sectionId', requireAuth, canAccessDesignInParam, getThumbnailUploadPolicy);
router.get('/upload-policy/:id', requireAuth, getDesignUploadPolicy);

router.get('/:designId/events', requireAuth, canAccessDesignInParam, getDesignEvents);
router.post('/:designId/events', requireAuth, canAccessDesignInParam, addDesignEvents);
router.put('/:designId/events/:eventId', requireAuth, canAccessDesignInParam, addDesignEvent);

router.get('/:designId/sections', requireAuth, canAccessDesignInParam, getSections);
router.post('/:designId/sections', requireAuth, canAccessDesignInParam, createSection);
router.del('/:designId/sections/:sectionId', requireAuth, canAccessDesignInParam, deleteSectionId);
router.patch('/:designId/sections/:sectionId', requireAuth, canAccessDesignInParam, canAccessSection, updateSection);
router.get('/:designId/sections/:sectionId/annotations', requireAuth, canAccessDesignInParam, canAccessSection, getSectionAnnotations);
router.post('/:designId/sections/:sectionId/annotations', requireAuth, canAccessDesignInParam, canCommentOnDesign, canAccessSection, createSectionAnnotation);
router.get('/:designId/sections/:sectionId/feature-placements', requireAuth, canAccessDesignInParam, canAccessSection, getSectionFeaturePlacements);
router.put('/:designId/sections/:sectionId/feature-placements', requireAuth, canAccessDesignInParam, canAccessSection, replaceSectionFeaturePlacements);
router.del('/:designId/sections/:sectionId/annotations/:annotationId', requireAuth, canAccessDesignInParam, canAccessSection, canAccessAnnotation, deleteSectionAnnotation);
router.patch('/:designId/sections/:sectionId/annotations/:annotationId', requireAuth, canAccessDesignInParam, canAccessSection, canAccessAnnotation, updateSectionAnnotation);

module.exports = router.routes();
