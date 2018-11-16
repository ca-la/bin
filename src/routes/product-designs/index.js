'use strict';

const intersection = require('lodash/intersection');
const pick = require('lodash/pick');
const Router = require('koa-router');
const uuid = require('node-uuid');

const {
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_REGION,
  AWS_S3_THUMBNAIL_BUCKET_NAME
} = require('../../config');
const canAccessAnnotation = require('../../middleware/can-access-annotation');
const canAccessSection = require('../../middleware/can-access-section');
const canAccessUserResource = require('../../middleware/can-access-user-resource');
const CollectionsDAO = require('../../dao/collections');
const compact = require('../../services/compact');
const deleteSection = require('../../services/delete-section');
const filterError = require('../../services/filter-error');
const findUserDesigns = require('../../services/find-user-designs');
const getDesignPermissions = require('../../services/get-design-permissions');
const InvalidDataError = require('../../errors/invalid-data');
const MissingPrerequisitesError = require('../../errors/missing-prerequisites');
const PricingCalculator = require('../../services/pricing-table');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignSectionAnnotationsDAO = require('../../dao/product-design-section-annotations');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const ProductDesignStatusesDAO = require('../../dao/product-design-statuses');
const ProductDesignStatusSlasDAO = require('../../dao/product-design-status-slas');
const DesignEventsDAO = require('../../dao/design-events');
const requireAuth = require('../../middleware/require-auth');
const sendAnnotationNotifications = require('../../services/send-annotation-notifications');
const updateDesignStatus = require('../../services/update-design-status');
const createDesign = require('../../services/create-design').default;
const User = require('../../domain-objects/user');
const UsersDAO = require('../../dao/users');
const { canAccessDesignInParam, canCommentOnDesign } = require('../../middleware/can-access-design');
const { requireValues } = require('../../services/require-properties');
const {
  sendDesignUpdateNotifications,
  sendSectionCreateNotifications,
  sendSectionUpdateNotifications
} = require('../../services/create-notifications');
const AWSService = require('../../services/aws');
const { generateFilename } = require('../../services/generate-filename');
const {
  sendPartnerAcceptServiceBidNotification,
  sendPartnerRejectServiceBidNotification
} = require('../../services/create-notifications');

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

function* getDesignsByUser() {
  canAccessUserResource.call(this, this.query.userId);

  const filters = compact({ status: this.query.status });
  this.body = yield findUserDesigns(this.query.userId, filters);

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
    yield getDesignsByUser;
  } else {
    yield getAllDesigns;
  }
}

function* getDesign() {
  const design = yield attachResources(this.state.design, this.state.designPermissions);

  this.body = design;
  this.status = 200;
}

function* getDesignUploadPolicy() {
  const remoteFileName = this.params.id || uuid.v4();
  const filenameWithExtension = generateFilename(remoteFileName, this.query.mimeType);
  const contentDisposition = `attachment; filename="${filenameWithExtension}"`;
  const { url, fields } = yield AWSService.getUploadPolicy(
    AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
    AWS_PRODUCT_DESIGN_IMAGE_BUCKET_REGION,
    remoteFileName,
    contentDisposition
  );

  this.body = {
    contentDisposition,
    downloadUrl: `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com/${remoteFileName}`,
    formData: fields,
    remoteFileName,
    uploadUrl: url
  };
  this.status = 200;
}

function* getThumbnailUploadPolicy() {
  const remoteFileName = this.params.sectionId || uuid.v4();
  const { url, fields } = yield AWSService.getThumbnailUploadPolicy(
    AWS_S3_THUMBNAIL_BUCKET_NAME,
    remoteFileName
  );

  this.body = {
    downloadUrl: `https://${AWS_S3_THUMBNAIL_BUCKET_NAME}.s3.amazonaws.com/${remoteFileName}`,
    formData: fields,
    remoteFileName,
    uploadUrl: url
  };
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

const ALLOWED_SECTION_PARAMS = [
  'position',
  'templateName',
  'customData',
  'title',
  'customImageId',
  'panelData',
  'type'
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

  design = yield attachResources(design, designPermissions);

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

  updated = yield attachResources(updated, this.state.designPermissions);

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
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  yield sendSectionCreateNotifications(
    section.id,
    this.params.designId,
    this.state.userId
  );

  this.body = section;
  this.status = 201;
}

function* deleteSectionId() {
  yield deleteSection({
    sectionId: this.params.sectionId,
    designId: this.params.designId,
    actorUserId: this.state.userId
  });

  this.status = 204;
}

function* updateSection() {
  const updated = yield ProductDesignSectionsDAO.update(
    this.params.sectionId,
    pick(this.request.body, ALLOWED_SECTION_PARAMS)
  )
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  yield sendSectionUpdateNotifications(
    this.params.sectionId,
    this.params.designId,
    this.state.userId
  );

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
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

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
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  const withUser = yield attachAnnotationUser(created);

  yield sendAnnotationNotifications({
    annotation: created,
    design: this.state.design,
    user: withUser.user,
    text
  })
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  this.body = withUser;
  this.status = 200;
}

function* deleteSectionAnnotation() {
  yield ProductDesignSectionAnnotationsDAO.deleteById(
    this.params.annotationId
  )
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  this.status = 204;
}

function* updateSectionAnnotation() {
  const updated = yield ProductDesignSectionAnnotationsDAO.update(
    this.params.annotationId,
    {
      text: this.request.body.text
    }
  )
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

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

function isAllowedEventType(role, event) {
  if (!event || (event && !event.type)) {
    return false;
  }

  const DESIGNER_ALLOWED_EVENT_TYPES = [
    'SUBMIT_DESIGN'
  ];
  const PARTNER_ALLOWED_EVENT_TYPES = [
    'ACCEPT_SERVICE_BID',
    'REJECT_SERVICE_BID'
  ];
  const ADMIN_ALLOWED_EVENT_TYPES = [
    ...DESIGNER_ALLOWED_EVENT_TYPES,
    ...PARTNER_ALLOWED_EVENT_TYPES,
    'BID_DESIGN',
    'REJECT_DESIGN',
    'COMMIT_COST_INPUTS',
    'REMOVE_PARTNER'
  ];

  const isAdmin = role === User.ROLES.admin;
  const isPartner = role === User.ROLES.partner;
  let allowedTypes = DESIGNER_ALLOWED_EVENT_TYPES;

  if (isPartner) {
    allowedTypes = PARTNER_ALLOWED_EVENT_TYPES;
  }

  if (isAdmin) {
    allowedTypes = ADMIN_ALLOWED_EVENT_TYPES;
  }

  return allowedTypes.includes(event.type);
}

function* addDesignEvent() {
  const { body: designEvent } = this.request;
  this.assert(isAllowedEventType(this.state.role, designEvent), 403);
  this.assert(
    designEvent.id === this.params.eventId,
    400,
    'ID in route does not match ID in request body'
  );

  const eventData = {
    ...designEvent,
    actorId: this.state.userId,
    designId: this.params.designId
  };

  const added = yield DesignEventsDAO.create(eventData);

  if (added.type === 'ACCEPT_SERVICE_BID') {
    sendPartnerAcceptServiceBidNotification(this.params.designId, this.state.userId);
  } else if (added.type === 'REJECT_SERVICE_BID') {
    sendPartnerRejectServiceBidNotification(this.params.designId, this.state.userId);
  }

  this.body = added;
  this.status = 200;
}

function* addDesignEvents() {
  const { body: designEvents } = this.request;
  this.assert(
    designEvents.every(isAllowedEventType.bind(null, this.state.role)),
    403
  );

  const eventData = designEvents.map(event => ({
    ...event,
    actorId: this.state.userId,
    designId: this.params.designId
  }));

  const added = yield DesignEventsDAO.createAll(eventData);

  this.body = added;
  this.status = 200;
}

function* getDesignEvents() {
  const events = yield DesignEventsDAO.findByDesignId(this.params.designId);

  this.body = events;
  this.status = 200;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, getDesigns);

router.del('/:designId', requireAuth, canAccessDesignInParam, deleteDesign);
router.get('/:designId', requireAuth, canAccessDesignInParam, getDesign);
router.patch('/:designId', requireAuth, canAccessDesignInParam, updateDesign);

router.get('/:designId/upload-policy/:sectionId', requireAuth, canAccessDesignInParam, getThumbnailUploadPolicy);
router.get('/upload-policy/:id', requireAuth, getDesignUploadPolicy);

router.get('/:designId/events', requireAuth, canAccessDesignInParam, getDesignEvents);
router.post('/:designId/events', requireAuth, canAccessDesignInParam, addDesignEvents);
router.put('/:designId/events/:eventId', requireAuth, canAccessDesignInParam, addDesignEvent);

router.get('/:designId/pricing', requireAuth, canAccessDesignInParam, getDesignPricing);

router.get('/:designId/collections', requireAuth, canAccessDesignInParam, getDesignCollections);

router.put('/:designId/status', requireAuth, canAccessDesignInParam, setStatus);

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
