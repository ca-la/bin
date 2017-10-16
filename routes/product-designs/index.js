'use strict';

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
const { canAccessDesignInParam } = require('../../middleware/can-access-design');

const router = new Router();

function* getDesigns() {
  this.assert(this.query.userId === this.state.userId, 403);

  const ownDesigns = yield ProductDesignsDAO.findByUserId(this.query.userId);

  const collaborations = yield ProductDesignCollaboratorsDAO.findByUserId(this.query.userId);
  const invitedDesigns = yield Promise.all(collaborations.map((collaboration) => {
    return ProductDesignsDAO.findById(collaboration.designId);
  }));

  this.body = [...ownDesigns, ...invitedDesigns];
  this.status = 200;
}

function* getDesign() {
  const design = yield ProductDesignsDAO.findById(this.params.designId);
  const owner = yield UsersDAO.findById(design.userId);
  design.setOwner(owner);

  this.body = design;
  this.status = 200;
}

function* createDesign() {
  const {
    description,
    previewImageUrls,
    metadata,
    productType,
    title
  } = this.request.body;

  const design = yield ProductDesignsDAO.create({
    description,
    previewImageUrls,
    metadata,
    productType,
    title,
    userId: this.state.userId
  })
    .catch(InvalidDataError, err => this.throw(400, err));

  this.body = design;
  this.status = 201;
}

function* updateDesign() {
  const {
    description,
    previewImageUrls,
    metadata,
    productType,
    title
  } = this.request.body;

  const updated = yield ProductDesignsDAO.update(
    this.params.designId,
    {
      description,
      previewImageUrls,
      metadata,
      productType,
      title
    }
  )
    .catch(InvalidDataError, err => this.throw(400, err));

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

function attachUser(annotation) {
  return UsersDAO.findById(annotation.userId).then((user) => {
    annotation.setUser(user);
    return annotation;
  });
}

function* getSectionAnnotations() {
  const annotations = yield ProductDesignSectionAnnotationsDAO.findBySectionId(
    this.params.sectionId
  );

  const annotationsWithUser = yield Promise.all(annotations.map(attachUser));

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

  const withUser = yield attachUser(created);
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

  const withUser = yield attachUser(updated);
  this.body = withUser;
  this.status = 200;
}

router.post('/', requireAuth, createDesign);
router.get('/', requireAuth, getDesigns);
router.patch('/:designId', requireAuth, canAccessDesignInParam, updateDesign);
router.get('/:designId', requireAuth, canAccessDesignInParam, getDesign);
router.del('/:designId', requireAuth, canAccessDesignInParam, deleteDesign);
router.get('/:designId/sections', requireAuth, canAccessDesignInParam, getSections);
router.post('/:designId/sections', requireAuth, canAccessDesignInParam, createSection);
router.del('/:designId/sections/:sectionId', requireAuth, canAccessDesignInParam, deleteSection);
router.patch('/:designId/sections/:sectionId', requireAuth, canAccessDesignInParam, canAccessSection, updateSection);
router.get('/:designId/sections/:sectionId/feature-placements', requireAuth, canAccessDesignInParam, canAccessSection, getSectionFeaturePlacements);
router.put('/:designId/sections/:sectionId/feature-placements', requireAuth, canAccessDesignInParam, canAccessSection, replaceSectionFeaturePlacements);
router.get('/:designId/sections/:sectionId/annotations', requireAuth, canAccessDesignInParam, canAccessSection, getSectionAnnotations);
router.post('/:designId/sections/:sectionId/annotations', requireAuth, canAccessDesignInParam, canAccessSection, createSectionAnnotation);
router.del('/:designId/sections/:sectionId/annotations/:annotationId', requireAuth, canAccessDesignInParam, canAccessSection, canAccessAnnotation, deleteSectionAnnotation);
router.patch('/:designId/sections/:sectionId/annotations/:annotationId', requireAuth, canAccessDesignInParam, canAccessSection, canAccessAnnotation, updateSectionAnnotation);

module.exports = router.routes();
