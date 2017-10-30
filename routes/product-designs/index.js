'use strict';

const pick = require('lodash/pick');
const Router = require('koa-router');

const canAccessAnnotation = require('../../middleware/can-access-annotation');
const canAccessSection = require('../../middleware/can-access-section');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignSectionAnnotationsDAO = require('../../dao/product-design-section-annotations');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const requireAuth = require('../../middleware/require-auth');
const UsersDAO = require('../../dao/users');
const { getComputedPricingTable, getFinalPricingTable } = require('../../services/pricing-table');
const { canAccessDesignInParam } = require('../../middleware/can-access-design');

const router = new Router();

async function attachDesignOwner(design) {
  const owner = await UsersDAO.findById(design.userId);
  design.setOwner(owner);
  return design;
}

function* getDesigns() {
  this.assert(this.query.userId === this.state.userId, 403);

  const ownDesigns = yield ProductDesignsDAO.findByUserId(this.query.userId);

  const collaborations = yield ProductDesignCollaboratorsDAO.findByUserId(this.query.userId);
  const invitedDesigns = yield Promise.all(collaborations.map((collaboration) => {
    return ProductDesignsDAO.findById(collaboration.designId);
  }));

  // Deleted designs become holes in the array right now - TODO maybe clean this
  // up via a reduce or something
  const availableInvitedDesigns = invitedDesigns.filter(Boolean);

  this.body = [...ownDesigns, ...availableInvitedDesigns];
  this.status = 200;
}

function* getDesign() {
  let design = yield ProductDesignsDAO.findById(this.params.designId);
  design = yield attachDesignOwner(design);

  this.body = design;
  this.status = 200;
}

function* getDesignPricing() {
  const design = yield ProductDesignsDAO.findById(this.params.designId);

  const computedPricingTable = yield getComputedPricingTable(design);
  const finalPricingTable = yield getFinalPricingTable(design, computedPricingTable);
  const overridePricingTable = design.overridePricingTable;

  const { canManagePricing } = this.state.designPermissions;

  this.body = {
    computedPricingTable: canManagePricing ? computedPricingTable : null,
    overridePricingTable: canManagePricing ? overridePricingTable : null,
    finalPricingTable
  };

  this.status = 200;
}

function* createDesign() {
  const data = pick(this.request.body,
    'description',
    'previewImageUrls',
    'metadata',
    'productType',
    'title',
    'unitsToProduce',
    'retailPriceCents'
  );

  let design = yield ProductDesignsDAO.create({
    ...data,
    userId: this.state.userId
  })
    .catch(InvalidDataError, err => this.throw(400, err));

  design = yield attachDesignOwner(design);

  this.body = design;
  this.status = 201;
}

function* updateDesign() {
  const data = pick(this.request.body,
    'description',
    'previewImageUrls',
    'metadata',
    'productType',
    'title',
    'unitsToProduce',
    'retailPriceCents'
  );

  let updated = yield ProductDesignsDAO.update(
    this.params.designId,
    data
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  updated = yield attachDesignOwner(updated);

  this.body = updated;
  this.status = 200;
}

function* deleteDesign() {
  yield ProductDesignsDAO.deleteById(this.params.designId);

  this.status = 204;
}

function* getSections() {
  const sections = yield ProductDesignSectionsDAO.findByDesignId(this.params.designId);

  this.body = sections;
  this.status = 200;
}

function* createSection() {
  const {
    templateName,
    title,
    customImageId,
    panelData
  } = this.request.body;

  const section = yield ProductDesignSectionsDAO.create({
    designId: this.params.designId,
    title,
    templateName,
    customImageId,
    panelData
  })
    .catch(InvalidDataError, err => this.throw(400, err));

  this.body = section;
  this.status = 201;
}

function* deleteSection() {
  yield ProductDesignSectionsDAO.deleteById(this.params.sectionId);

  this.status = 204;
}

function* updateSection() {
  const {
    templateName,
    title,
    customImageId,
    panelData
  } = this.request.body;

  const updated = yield ProductDesignSectionsDAO.update(
    this.params.sectionId,
    {
      templateName,
      title,
      customImageId,
      panelData
    }
  )
    .catch(InvalidDataError, err => this.throw(400, err));

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

router.post('/', requireAuth, createDesign);
router.get('/', requireAuth, getDesigns);
router.del('/:designId', requireAuth, canAccessDesignInParam, deleteDesign);
router.del('/:designId/sections/:sectionId', requireAuth, canAccessDesignInParam, deleteSection);
router.del('/:designId/sections/:sectionId/annotations/:annotationId', requireAuth, canAccessDesignInParam, canAccessSection, canAccessAnnotation, deleteSectionAnnotation);
router.get('/:designId', requireAuth, canAccessDesignInParam, getDesign);
router.get('/:designId/pricing', requireAuth, canAccessDesignInParam, getDesignPricing);
router.get('/:designId/sections', requireAuth, canAccessDesignInParam, getSections);
router.get('/:designId/sections/:sectionId/annotations', requireAuth, canAccessDesignInParam, canAccessSection, getSectionAnnotations);
router.get('/:designId/sections/:sectionId/feature-placements', requireAuth, canAccessDesignInParam, canAccessSection, getSectionFeaturePlacements);
router.patch('/:designId', requireAuth, canAccessDesignInParam, updateDesign);
router.patch('/:designId/sections/:sectionId', requireAuth, canAccessDesignInParam, canAccessSection, updateSection);
router.patch('/:designId/sections/:sectionId/annotations/:annotationId', requireAuth, canAccessDesignInParam, canAccessSection, canAccessAnnotation, updateSectionAnnotation);
router.post('/:designId/sections', requireAuth, canAccessDesignInParam, createSection);
router.post('/:designId/sections/:sectionId/annotations', requireAuth, canAccessDesignInParam, canAccessSection, createSectionAnnotation);
router.put('/:designId/sections/:sectionId/feature-placements', requireAuth, canAccessDesignInParam, canAccessSection, replaceSectionFeaturePlacements);

module.exports = router.routes();
