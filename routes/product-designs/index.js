'use strict';

const pick = require('lodash/pick');
const Router = require('koa-router');
const Bluebird = require('bluebird');

const canAccessAnnotation = require('../../middleware/can-access-annotation');
const canAccessSection = require('../../middleware/can-access-section');
const compact = require('../../services/compact');
const getDesignPermissions = require('../../services/get-design-permissions');
const InvalidDataError = require('../../errors/invalid-data');
const MissingPrerequisitesError = require('../../errors/missing-prerequisites');
const PricingCalculator = require('../../services/pricing-table');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignSectionAnnotationsDAO = require('../../dao/product-design-section-annotations');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const ProductDesignServicesDAO = require('../../dao/product-design-services');
const ProductDesignStatusesDAO = require('../../dao/product-design-statuses');
const ProductDesignStatusSlasDAO = require('../../dao/product-design-status-slas');
const requireAuth = require('../../middleware/require-auth');
const sendAnnotationNotifications = require('../../services/send-annotation-notifications');
const updateDesignStatus = require('../../services/update-design-status');
const UsersDAO = require('../../dao/users');
const { canAccessDesignInParam, canCommentOnDesign } = require('../../middleware/can-access-design');
const { requireValues } = require('../../services/require-properties');

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

async function attachResources(design, permissions) {
  requireValues({ design, permissions });

  let attached = design;
  attached = await attachDesignOwner(attached);
  attached = await attachStatuses(attached);
  attached.setPermissions(permissions);
  return attached;
}


function* getDesigns() {
  this.assert(this.query.userId === this.state.userId, 403);

  const filters = compact({ status: this.query.status });
  this.body = yield ProductDesignsDAO.findAccessibleToUser(this.query.userId, filters);

  this.status = 200;
}

function* getDesign() {
  const design = yield attachResources(this.state.design, this.state.designPermissions);

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
  } = yield Bluebird.resolve(calculator.getAllPricingTables())
    .catch(MissingPrerequisitesError, err => this.throw(400, err));

  this.body = {
    computedPricingTable: canManagePricing ? computedPricingTable : null,
    overridePricingTable: canManagePricing ? overridePricingTable : null,
    finalPricingTable
  };

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

const ALLOWED_SECTION_PARAMS = [
  'position',
  'templateName',
  'customData',
  'title',
  'customImageId',
  'panelData',
  'type'
];

function* createDesign() {
  const userData = pick(this.request.body, ALLOWED_DESIGN_PARAMS);

  const data = Object.assign({}, userData, {
    userId: this.state.userId
  });

  let design = yield ProductDesignsDAO.create(data)
    .catch(InvalidDataError, err => this.throw(400, err));

  // Create a default set of services
  yield ProductDesignServicesDAO.replaceForDesign(design.id, [
    { serviceId: 'SOURCING' },
    { serviceId: 'TECHNICAL_DESIGN' },
    { serviceId: 'PATTERN_MAKING' },
    { serviceId: 'SAMPLING' },
    { serviceId: 'PRODUCTION' },
    { serviceId: 'FULFILLMENT' }
  ]);

  const designPermissions = yield getDesignPermissions(
    design,
    this.state.userId,
    this.state.role
  );

  design = yield attachResources(design, designPermissions);

  this.body = design;
  this.status = 201;
}

function* updateDesign() {
  const data = pick(this.request.body, ALLOWED_DESIGN_PARAMS);

  let updated = yield ProductDesignsDAO.update(
    this.params.designId,
    data
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  updated = yield attachResources(updated, this.state.designPermissions);

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

function* getSections() {
  const sections = yield ProductDesignSectionsDAO.findByDesignId(this.params.designId);

  this.body = sections;
  this.status = 200;
}

function* createSection() {
  const data = pick(this.request.body, ALLOWED_SECTION_PARAMS);

  const section = yield ProductDesignSectionsDAO.create(Object.assign({}, data, {
    designId: this.params.designId
  }))
    .catch(InvalidDataError, err => this.throw(400, err));

  yield sendSectionCreateNotifications({
    sectionId: this.params.sectionId,
    designId: this.params.designId,
    userId: this.state.userId
  });

  this.body = section;
  this.status = 201;
}

function* deleteSection() {
  yield ProductDesignSectionsDAO.deleteById(this.params.sectionId);

  yield sendSectionDeleteNotifications({
    sectionId: this.params.sectionId,
    designId: this.params.designId,
    userId: this.state.userId
  });

  this.status = 204;
}

function* updateSection() {
  const updated = yield ProductDesignSectionsDAO.update(
    this.params.sectionId,
    pick(this.request.body, ALLOWED_SECTION_PARAMS)
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  yield sendSectionUpdateNotifications({
    sectionId: this.params.sectionId,
    designId: this.params.designId,
    userId: this.state.userId,
    description: 'edited the section'
  });

  this.body = updated;
  this.status = 200;
}

function* getSectionFeaturePlacements() {
  const placements = yield ProductDesignFeaturePlacementsDAO.findBySectionId(this.params.sectionId);

  this.body = placements;
  this.status = 200;
}

function* replaceSectionFeaturePlacements() {
  // TODO pick safe attrs
  const updated = yield ProductDesignFeaturePlacementsDAO.replaceForSection(
    this.params.sectionId,
    this.request.body
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  yield sendFeaturePlacementUpdateNotifications({
    sectionId: this.params.sectionId,
    designId: this.params.designId,
    userId: this.state.userId
  });

  this.body = updated;
  this.status = 200;
}

function attachAnnotationUser(annotation) {
  return UsersDAO.findById(annotation.userId).then((user) => {
    annotation.setUser(user);
    return annotation;
  });
}

function* getSectionAnnotations() {
  const annotations = yield ProductDesignSectionAnnotationsDAO.findBySectionId(
    this.params.sectionId
  );

  const annotationsWithUser = yield Promise.all(annotations.map(attachAnnotationUser));

  this.body = annotationsWithUser;
  this.status = 200;
}

function* createSectionAnnotation() {
  const {
    x,
    y,
    text,
    inReplyToId
  } = this.request.body;

  const created = yield ProductDesignSectionAnnotationsDAO.createForSection(
    this.params.sectionId,
    {
      x,
      y,
      text,
      inReplyToId,
      userId: this.state.userId
    }
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  const withUser = yield attachAnnotationUser(created);

  yield sendAnnotationNotifications({
    annotation: created,
    design: this.state.design,
    user: withUser.user,
    text
  });

  this.body = withUser;
  this.status = 200;
}

function* deleteSectionAnnotation() {
  yield ProductDesignSectionAnnotationsDAO.deleteById(
    this.params.annotationId
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  this.status = 204;
}

function* updateSectionAnnotation() {
  const updated = yield ProductDesignSectionAnnotationsDAO.update(
    this.params.annotationId,
    {
      text: this.request.body.text
    }
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  const withUser = yield attachAnnotationUser(updated);
  this.body = withUser;
  this.status = 200;
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

  const updated = yield Bluebird.resolve(updateDesignStatus(
    this.params.designId,
    newStatus,
    this.state.userId
  ))
    .catch(InvalidDataError, err => this.throw(400, err));

  this.body = { status: updated };
  this.status = 200;
}

router.post('/', requireAuth, createDesign);
router.get('/', requireAuth, getDesigns);

router.del('/:designId', requireAuth, canAccessDesignInParam, deleteDesign);
router.get('/:designId', requireAuth, canAccessDesignInParam, getDesign);
router.patch('/:designId', requireAuth, canAccessDesignInParam, updateDesign);

router.get('/:designId/pricing', requireAuth, canAccessDesignInParam, getDesignPricing);

router.put('/:designId/status', requireAuth, canAccessDesignInParam, setStatus);

router.get('/:designId/sections', requireAuth, canAccessDesignInParam, getSections);
router.post('/:designId/sections', requireAuth, canAccessDesignInParam, createSection);

router.del('/:designId/sections/:sectionId', requireAuth, canAccessDesignInParam, deleteSection);
router.patch('/:designId/sections/:sectionId', requireAuth, canAccessDesignInParam, canAccessSection, updateSection);

router.get('/:designId/sections/:sectionId/annotations', requireAuth, canAccessDesignInParam, canAccessSection, getSectionAnnotations);
router.post('/:designId/sections/:sectionId/annotations', requireAuth, canAccessDesignInParam, canCommentOnDesign, canAccessSection, createSectionAnnotation);

router.get('/:designId/sections/:sectionId/feature-placements', requireAuth, canAccessDesignInParam, canAccessSection, getSectionFeaturePlacements);
router.put('/:designId/sections/:sectionId/feature-placements', requireAuth, canAccessDesignInParam, canAccessSection, replaceSectionFeaturePlacements);

router.del('/:designId/sections/:sectionId/annotations/:annotationId', requireAuth, canAccessDesignInParam, canAccessSection, canAccessAnnotation, deleteSectionAnnotation);
router.patch('/:designId/sections/:sectionId/annotations/:annotationId', requireAuth, canAccessDesignInParam, canAccessSection, canAccessAnnotation, updateSectionAnnotation);

module.exports = router.routes();
