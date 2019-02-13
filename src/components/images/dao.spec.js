'use strict';

const {
  create,
  findByUserId
} = require('./dao');

const createUser = require('../../test-helpers/create-user');
const { test } = require('../../test-helpers/fresh');

test('ProductDesignImagesDAO.findByUserId returns images', (t) => {
  let userId;
  let imageId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;

      return create({
        userId,
        originalWidthPx: 1024,
        originalHeightPx: 768,
        mimeType: 'image/jpeg'
      });
    })
    .then((image) => {
      imageId = image.id;
      return findByUserId(userId);
    })
    .then((images) => {
      t.equal(images[0].id, imageId);
      t.equal(images[0].originalWidthPx, 1024);
      t.equal(images[0].originalHeightPx, 768);
      t.equal(images[0].mimeType, 'image/jpeg');
    });
});
