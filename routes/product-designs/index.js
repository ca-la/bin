'use strict';

const Router = require('koa-router');

const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignSectionAnnotationsDAO = require('../../dao/product-design-section-annotations');
const requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* canAccessDesign(next) {
  const design = yield ProductDesignsDAO.findById(this.params.designId)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.assert(design, 404);

  this.assert(this.state.userId === design.userId, 403);

  this.state.design = design;

  yield next;
}

function* canAccessSection(next) {
  if (!this.state.design) {
    throw new Error('Must confirm canAccessDesign first');
  }

  const section = yield ProductDesignSectionsDAO.findById(this.params.sectionId)
    .catch(InvalidDataError, err => this.throw(404, err));
  this.assert(section, 404);
  this.assert(section.designId === this.state.design.id, 404);

  this.state.section = section;

  yield next;
}

function* canAccessAnnotation(next) {
  if (!this.state.section) {
    throw new Error('Must confirm canAccessSection first');
  }

  const annotation = yield ProductDesignSectionAnnotationsDAO.findById(this.params.annotationId)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.assert(annotation, 404);
  this.assert(annotation.sectionId === this.state.section.id, 404);
  this.assert(annotation.userId === this.state.userId, 403);

  yield next;
}

function* getDesigns() {
  this.assert(this.query.userId === this.state.userId, 403);
  const designs = yield ProductDesignsDAO.findByUserId(this.query.userId);

  this.body = designs;
  this.status = 200;
}

function* getDesign() {
  const design = yield ProductDesignsDAO.findById(this.params.designId);

  this.body = design;
  this.status = 200;
}

function* createDesign() {
  const {
    description,
    productOptions,
    productType,
    title
  } = this.request.body;

  const design = yield ProductDesignsDAO.create({
    description,
    productOptions,
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
    productOptions,
    productType,
    title
  } = this.request.body;

  const updated = yield ProductDesignsDAO.update(
    this.params.designId,
    {
      description,
      productOptions,
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
    customImageId
  } = this.request.body;

  const section = yield ProductDesignSectionsDAO.create({
    designId: this.params.designId,
    templateName,
    customImageId
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
    customImageId
  } = this.request.body;

  const updated = yield ProductDesignSectionsDAO.update(
    this.params.designId,
    {
      templateName,
      customImageId
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
  const updated = yield ProductDesignFeaturePlacementsDAO.replaceForSection(
    this.params.sectionId,
    this.request.body
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  this.body = updated;
  this.status = 200;
}

function* getSectionAnnotations() {
  const annotations = yield ProductDesignSectionAnnotationsDAO.findBySectionId(
    this.params.sectionId
  );

  this.body = annotations;
  this.status = 200;
}

function* createSectionAnnotation() {
  const updated = yield ProductDesignSectionAnnotationsDAO.createForSection(
    this.params.sectionId,
    this.request.body
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  this.body = updated;
  this.status = 200;
}

function* deleteSectionAnnotation() {
  const updated = yield ProductDesignSectionAnnotationsDAO.deleteById(
    this.params.annotationId,
    this.request.body
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  this.body = updated;
  this.status = 200;
}

router.post('/', requireAuth, createDesign);
router.get('/', requireAuth, getDesigns);
router.patch('/:designId', requireAuth, canAccessDesign, updateDesign);
router.get('/:designId', requireAuth, canAccessDesign, getDesign);
router.del('/:designId', requireAuth, canAccessDesign, deleteDesign);
router.get('/:designId/sections', requireAuth, canAccessDesign, getSections);
router.post('/:designId/sections', requireAuth, canAccessDesign, createSection);
router.del('/:designId/sections/:sectionId', requireAuth, canAccessDesign, deleteSection);
router.patch('/:designId/sections/:sectionId', requireAuth, canAccessDesign, canAccessSection, updateSection);
router.get('/:designId/sections/:sectionId/feature-placements', requireAuth, canAccessDesign, canAccessSection, getSectionFeaturePlacements);
router.put('/:designId/sections/:sectionId/feature-placements', requireAuth, canAccessDesign, canAccessSection, replaceSectionFeaturePlacements);
router.get('/:designId/sections/:sectionId/annotations', requireAuth, canAccessDesign, canAccessSection, getSectionAnnotations);
router.post('/:designId/sections/:sectionId/annotations', requireAuth, canAccessDesign, canAccessSection, createSectionAnnotation);
router.del('/:designId/sections/:sectionId/annotations/:annotationId', requireAuth, canAccessDesign, canAccessSection, canAccessAnnotation, deleteSectionAnnotation);

module.exports = router.routes();
