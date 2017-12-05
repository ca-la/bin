'use strict';

const {
  create,
  findForUser
} = require('./index');

const createImage = require('../product-design-images').create;

const createUser = require('../../test-helpers/create-user');
const { test } = require('../../test-helpers/fresh');

test('ProductDesignOptionsDAO.findForUser returns user fabrics first, then builtin fabrics, ordered by whether they have an image', (t) => {
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
          title: 'User - No Image',
          type: 'FABRIC'
        }),
        create({
          isBuiltinOption: true,
          title: 'Builtin - No Image',
          type: 'FABRIC'
        }),
        create({
          userId,
          previewImageId: image.id,
          title: 'User - With Image',
          type: 'FABRIC'
        }),
        create({
          isBuiltinOption: true,
          previewImageId: image.id,
          title: 'Builtin - With Image',
          type: 'FABRIC'
        }),
        create({
          userId,
          title: 'User - No Image',
          type: 'FABRIC'
        }),
        create({
          isBuiltinOption: true,
          title: 'Builtin - No Image',
          type: 'FABRIC'
        })
      ]);
    })
    .then(() => {
      return findForUser(userId);
    })
    .then((options) => {
      t.equal(options[0].title, 'User - With Image');
      t.equal(options[1].title, 'User - No Image');
      t.equal(options[2].title, 'User - No Image');
      t.equal(options[3].title, 'Builtin - With Image');
      t.equal(options[4].title, 'Builtin - No Image');
      t.equal(options[5].title, 'Builtin - No Image');
    });
});
