'use strict';

const createUser = require('../../test-helpers/create-user');
const ProductDesignsDAO = require('../product-designs');
const ProductDesignSectionsDAO = require('./index');
const { test } = require('../../test-helpers/fresh');

test('ProductDesignSectionsDAO.create creates a design', (t) => {
  let userId;
  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
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
    .then((section) => {
      t.
    });
});

test('ProductDesignSectionsDAO.update updates a design', (t) => {
  return createUser()
    .then(({ user }) => {
      return ProductDesignSectionsDAO.create({
        title: 'Plain White Tee',
        productType: 'TEESHIRT',
        userId: user.id
      });
    })
    .then((design) => {
      return ProductDesignSectionsDAO.update(design.id, { title: 'Blue Tee' });
    })
    .then((updatedDesign) => {
      t.equal(updatedDesign.title, 'Blue Tee');
    });
});
