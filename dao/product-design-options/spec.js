'use strict';

const {
  create,
  findForUser
} = require('./index');

const createImage = require('../product-design-images').create;

const createUser = require('../../test-helpers/create-user');
const { test } = require('../../test-helpers/fresh');

test('ProductDesignOptionsDAO.findForUser returns options with images first', (t) => {
  let userId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return createImage({ userId });
    })
    .then((image) => {
      return Promise.all([
        create({
          userId,
          title: 'No Image',
          type: 'FABRIC'
        }),
        create({
          userId,
          previewImageId: image.id,
          title: 'Has Image',
          type: 'FABRIC'
        }),
        create({
          userId,
          title: 'No Image',
          type: 'FABRIC'
        })
      ]);
    })
    .then(() => {
      return findForUser(userId);
    })
    .then((options) => {
      t.equal(options[0].title, 'Has Image');
      t.equal(options[1].title, 'No Image');
      t.equal(options[2].title, 'No Image');
    });
});
