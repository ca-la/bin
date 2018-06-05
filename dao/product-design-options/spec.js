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
      return createImage({
        userId,
        mimeType: 'image/jpeg',
        originalHeightPx: 1024,
        originalWidthPx: 1024
      });
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

test('ProductDesignOptionsDAO.findForUser returns respects limit and offset if provided', (t) => {
  let userId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return createImage({
        userId,
        mimeType: 'image/jpeg',
        originalHeightPx: 1024,
        originalWidthPx: 1024
      });
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
      return findForUser(userId, { limit: 1, offset: 2 });
    })
    .then((options) => {
      t.equal(options[0].title, 'User - No Image');
      t.equal(options.length, 1);
    });
});

test('ProductDesignOptionsDAO.findForUser respects zero limit', (t) => {
  let userId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return createImage({
        userId,
        mimeType: 'image/jpeg',
        originalHeightPx: 1024,
        originalWidthPx: 1024
      });
    })
    .then((image) => {
      return Promise.all([
        create({
          userId,
          previewImageId: image.id,
          title: 'User - With Image',
          type: 'FABRIC'
        })
      ]);
    })
    .then(() => {
      return findForUser(userId, { limit: 0 });
    })
    .then((options) => {
      t.equal(options.length, 0);
    });
});

test('ProductDesignOptionsDAO.findForUser throws for non-number limit and offset', (t) => {
  let userId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return createImage({
        userId,
        mimeType: 'image/jpeg',
        originalHeightPx: 1024,
        originalWidthPx: 1024
      });
    })
    .then(() => {
      return findForUser(userId, { limit: 'foo', offset: 'bar' });
    })
    .then((options) => {
      t.fail('Got a resolved promise instead of the expected rejection with: ', options);
    })
    .catch((error) => {
      t.ok(error instanceof Error);
    });
});

test('ProductDesignOptionsDAO.findForUser finds based on matching search terms', (t) => {
  let userId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;

      return Promise.all([
        create({
          userId,
          title: 'User - No Image, Silk',
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
      return findForUser(userId, { search: 'silk' });
    })
    .then((options) => {
      t.equal(options[0].title, 'User - No Image, Silk');
      t.equal(options.length, 1);
    });
});
