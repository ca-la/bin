'use strict';

const pick = require('lodash/pick');

const filterError = require('../../../services/filter-error');
const { validateValues } = require('../../../services/validate');
const InvalidDataError = require('../../../errors/invalid-data');
const UsersDAO = require('../../users/dao');
const ProductDesignSectionsDAO = require('../../../dao/product-design-sections');
const ProductDesignSectionAnnotationsDAO = require('../../../dao/product-design-section-annotations');
const ProductDesignFeaturePlacementsDAO = require('../../../dao/product-design-feature-placements');
const {
  sendSectionCreateNotifications,
  sendSectionUpdateNotifications
} = require('../../../services/create-notifications');
const deleteSection = require('../../../services/delete-section');

const ALLOWED_SECTION_PARAMS = [
  'position',
  'templateName',
  'customData',
  'title',
  'customImageId',
  'panelData',
  'type'
];

// TODO: Deprecated as of V2.

function* getSections() {
  const sections = yield ProductDesignSectionsDAO.findByDesignId(
    this.params.designId
  );

  this.body = sections;
  this.status = 200;
}

function* createSection() {
  const data = pick(this.request.body, ALLOWED_SECTION_PARAMS);

  const section = yield ProductDesignSectionsDAO.create(
    Object.assign({}, data, {
      designId: this.params.designId
    })
  ).catch(filterError(InvalidDataError, err => this.throw(400, err)));

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
  ).catch(filterError(InvalidDataError, err => this.throw(400, err)));

  yield sendSectionUpdateNotifications(
    this.params.sectionId,
    this.params.designId,
    this.state.userId
  );

  this.body = updated;
  this.status = 200;
}

function* getSectionFeaturePlacements() {
  const placements = yield ProductDesignFeaturePlacementsDAO.findBySectionId(
    this.params.sectionId
  );

  this.body = placements;
  this.status = 200;
}

function* replaceSectionFeaturePlacements() {
  // TODO pick safe attrs
  const updated = yield ProductDesignFeaturePlacementsDAO.replaceForSection(
    this.params.sectionId,
    this.request.body
  ).catch(filterError(InvalidDataError, err => this.throw(400, err)));

  this.body = updated;
  this.status = 200;
}

function attachAnnotationUser(annotation) {
  return UsersDAO.findById(annotation.userId).then(user => {
    annotation.setUser(user);
    return annotation;
  });
}

function* getSectionAnnotations() {
  const annotations = yield ProductDesignSectionAnnotationsDAO.findBySectionId(
    this.params.sectionId
  );

  const annotationsWithUser = yield Promise.all(
    annotations.map(attachAnnotationUser)
  );

  this.body = annotationsWithUser;
  this.status = 200;
}

function* createSectionAnnotation() {
  const { x, y, text, inReplyToId } = this.request.body;
  validateValues({ x, y, text });

  const created = yield ProductDesignSectionAnnotationsDAO.createForSection(
    this.params.sectionId,
    {
      x,
      y,
      text,
      inReplyToId,
      userId: this.state.userId
    }
  ).catch(filterError(InvalidDataError, err => this.throw(400, err)));

  const withUser = yield attachAnnotationUser(created);

  this.body = withUser;
  this.status = 200;
}

module.exports = {
  getSections,
  createSection,
  deleteSectionId,
  updateSection,
  getSectionFeaturePlacements,
  replaceSectionFeaturePlacements,
  getSectionAnnotations,
  createSectionAnnotation
};
