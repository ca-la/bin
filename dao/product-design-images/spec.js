'use strict';

const {
  create,
  deleteById,
  findByUserId
} = require('./index');

const createUser = require('../../test-helpers/create-user');
const { test } = require('../../test-helpers/fresh');

test('ProductDesignImagesDAO.findByUserId returns images', (t) => {
  let userId;
  let imageId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return create({ userId });
    })
    .then((image) => {
      imageId = image.id;
      return findByUserId(userId);
    })
    .then((images) => {
      t.equal(images[0].id, imageId);
    });
});

test('ProductDesignImagesDAO.deleteById deletes', (t) => {
  return createUser({ withSession: false })
    .then(({ user }) => {
      return create({
        userId: user.id
      });
    })
    .then((image) => {
      return deleteById(image.id);
    })
    .then((deleted) => {
      t.notEqual(deleted.deletedAt, null);
    });
});
