'use strict';

const {
  create,
  deleteById,
  findByDesignId
} = require('./index');

const ProductDesignsDAO = require('../product-designs');
const createUser = require('../../test-helpers/create-user');
const { test } = require('../../test-helpers/fresh');

test('ProductDesignImagesDAO.findByDesignId returns images', (t) => {
  let designId;
  let imageId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      return ProductDesignsDAO.create({
        productType: 'TSHIRT',
        title: 'That New New',
        userId: user.id
      });
    })
    .then((design) => {
      designId = design.id;
      return create({ designId });
    })
    .then((image) => {
      imageId = image.id;
      return findByDesignId(designId);
    })
    .then((images) => {
      t.equal(images[0].id, imageId);
    });
});

test('ProductDesignImagesDAO.deleteById deletes', (t) => {
  return createUser({ withSession: false })
    .then(({ user }) => {
      return ProductDesignsDAO.create({
        productType: 'TSHIRT',
        title: 'That New New',
        userId: user.id
      });
    })
    .then((design) => {
      return create({
        designId: design.id
      });
    })
    .then((image) => {
      return deleteById(image.id);
    })
    .then((deleted) => {
      t.notEqual(deleted.deletedAt, null);
    });
});
