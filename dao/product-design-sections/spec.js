'use strict';

const createUser = require('../../test-helpers/create-user');
const ProductDesignsDAO = require('../product-designs');
const ProductDesignSectionsDAO = require('./index');
const ProductDesignImagesDAO = require('../product-design-images');
const { test } = require('../../test-helpers/fresh');

test('ProductDesignSectionsDAO.create creates a section', (t) => {
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
      t.equal(section.templateName, 'okok');
    });
});

test('ProductDesignSectionsDAO.update updates a section', (t) => {
  let imageId;
  return createUser({ withSession: false })
    .then(({ user }) => {
      return ProductDesignsDAO.create({
        title: 'Plain White Tee',
        productType: 'TEESHIRT',
        userId: user.id
      });
    })
    .then((design) => {
      return Promise.all([
        ProductDesignImagesDAO.create({ designId: design.id }),
        ProductDesignSectionsDAO.create({
          designId: design.id,
          templateName: 'okok'
        })
      ]);
    })
    .then(([image, section]) => {
      imageId = image.id;
      return ProductDesignSectionsDAO.update(section.id, {
        templateName: null,
        customImageId: imageId
      });
    })
    .then((section) => {
      t.equal(section.customImageId, imageId);
    });
});
