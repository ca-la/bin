'use strict';

const createUser = require('../../test-helpers/create-user');
const ProductDesignSectionAnnotationsDAO = require('./index');
const ProductDesignsDAO = require('../product-designs');
const ProductDesignSectionsDAO = require('../product-design-sections');
const { test } = require('../../test-helpers/fresh');

const ANNOTATION_DATA = [
  {
    x: 10,
    y: 20,
    text: 'cool'
  },
  {
    x: 30,
    y: 40,
    text: 'cooler'
  }
];


test('ProductDesignSectionAnnotationsDAO.replaceForSection creates and updates annotations', (t) => {
  let sectionId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      return ProductDesignsDAO.create({
        title: 'Plain White Tee',
        productType: 'TEESHIRT',
        userId: user.id
      });
    })
    .then((design) => {
      return ProductDesignSectionsDAO.create({
        designId: design.id,
        templateName: 'okok'
      });
    })
    .then((section) => {
      sectionId = section.id;
      return ProductDesignSectionAnnotationsDAO.replaceForSection(sectionId, ANNOTATION_DATA);
    })
    .then(() => {
      return ProductDesignSectionAnnotationsDAO.findBySectionId(sectionId);
    })
    .then((annotations) => {
      t.equal(annotations.length, 2);
      t.equal(annotations[0].sectionId, sectionId);
      t.equal(annotations[0].text, 'cool');
      t.equal(annotations[1].sectionId, sectionId);
      t.equal(annotations[1].text, 'cooler');
    });
});
