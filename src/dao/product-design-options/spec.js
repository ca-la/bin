"use strict";

const { create, findForUser } = require("./index");

const createImage = require("../../test-helpers/factories/asset").default;

const createUser = require("../../test-helpers/create-user");
const { test } = require("../../test-helpers/fresh");

test("ProductDesignOptionsDAO.findForUser returns user fabrics first, then builtin fabrics, ordered by whether they have an image", (t) => {
  let userId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return createImage({
        userId,
        mimeType: "image/jpeg",
        originalHeightPx: 1024,
        originalWidthPx: 1024,
      });
    })
    .then((factoryAsset) => {
      return Promise.all([
        create({
          userId,
          title: "User - No Image",
          type: "FABRIC",
        }),
        create({
          isBuiltinOption: true,
          title: "Builtin - No Image",
          type: "FABRIC",
        }),
        create({
          userId,
          previewImageId: factoryAsset.asset.id,
          title: "User - With Image",
          type: "FABRIC",
        }),
        create({
          isBuiltinOption: true,
          previewImageId: factoryAsset.asset.id,
          title: "Builtin - With Image",
          type: "FABRIC",
        }),
        create({
          userId,
          title: "User - No Image",
          type: "FABRIC",
        }),
        create({
          isBuiltinOption: true,
          title: "Builtin - No Image",
          type: "FABRIC",
        }),
      ]);
    })
    .then(() => {
      return findForUser(userId);
    })
    .then((options) => {
      t.equal(options[0].title, "User - With Image");
      t.equal(options[1].title, "User - No Image");
      t.equal(options[2].title, "User - No Image");
      t.equal(options[3].title, "Builtin - With Image");
      t.equal(options[4].title, "Builtin - No Image");
      t.equal(options[5].title, "Builtin - No Image");
    });
});

test("ProductDesignOptionsDAO.findForUser returns respects limit and offset if provided", (t) => {
  let userId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return createImage({
        userId,
        mimeType: "image/jpeg",
        originalHeightPx: 1024,
        originalWidthPx: 1024,
      });
    })
    .then((factoryAsset) => {
      return Promise.all([
        create({
          userId,
          title: "User - No Image",
          type: "FABRIC",
        }),
        create({
          isBuiltinOption: true,
          title: "Builtin - No Image",
          type: "FABRIC",
        }),
        create({
          userId,
          previewImageId: factoryAsset.asset.id,
          title: "User - With Image",
          type: "FABRIC",
        }),
        create({
          isBuiltinOption: true,
          previewImageId: factoryAsset.asset.id,
          title: "Builtin - With Image",
          type: "FABRIC",
        }),
        create({
          userId,
          title: "User - No Image",
          type: "FABRIC",
        }),
        create({
          isBuiltinOption: true,
          title: "Builtin - No Image",
          type: "FABRIC",
        }),
      ]);
    })
    .then(() => {
      return findForUser(userId, { limit: 1, offset: 2 });
    })
    .then((options) => {
      t.equal(options[0].title, "User - No Image");
      t.equal(options.length, 1);
    });
});

test("ProductDesignOptionsDAO.findForUser respects zero limit", (t) => {
  let userId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return createImage({
        userId,
        mimeType: "image/jpeg",
        originalHeightPx: 1024,
        originalWidthPx: 1024,
      });
    })
    .then((factoryAsset) => {
      return Promise.all([
        create({
          userId,
          previewImageId: factoryAsset.asset.id,
          title: "User - With Image",
          type: "FABRIC",
        }),
      ]);
    })
    .then(() => {
      return findForUser(userId, { limit: 0 });
    })
    .then((options) => {
      t.equal(options.length, 0);
    });
});

test("ProductDesignOptionsDAO.findForUser throws for non-number limit and offset", (t) => {
  let userId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return createImage({
        userId,
        mimeType: "image/jpeg",
        originalHeightPx: 1024,
        originalWidthPx: 1024,
      });
    })
    .then(() => {
      return findForUser(userId, { limit: "foo", offset: "bar" });
    })
    .then((options) => {
      t.fail(
        "Got a resolved promise instead of the expected rejection with: ",
        options
      );
    })
    .catch((error) => {
      t.ok(error instanceof Error);
    });
});

test("ProductDesignOptionsDAO.findForUser finds based on matching search terms", (t) => {
  let userId;

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;

      return Promise.all([
        create({
          userId,
          title: "User - No Image, Silk",
          type: "FABRIC",
        }),
        create({
          isBuiltinOption: true,
          title: "Builtin - No Image",
          type: "FABRIC",
        }),
      ]);
    })
    .then(() => {
      return findForUser(userId, { search: "silk" });
    })
    .then((options) => {
      t.equal(options[0].title, "User - No Image, Silk");
      t.equal(options.length, 1);
    });
});

test("ProductDesignOptionsDAO.findForUser with records with identical creation dates, paginates without duplicates", (t) => {
  const now = new Date();

  // Doesn't hit the weird duplicates case unless you have many more rows than your page size
  const DUPLICATE_MULTIPLIER = 4.5;
  let userId;

  function createOptions(count, createdAt) {
    const promises = [];
    for (let i = 0; i < count; i += 1) {
      promises.push(
        create({
          userId,
          title: "Title",
          type: "FABRIC",
          createdAt,
        })
      );
    }
    return Promise.all(promises);
  }

  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;

      return createOptions(10 * DUPLICATE_MULTIPLIER, now);
    })
    .then(() => {
      return Promise.all([
        findForUser(userId, { limit: 10, offset: 0 }),
        findForUser(userId, { limit: 10, offset: 10 }),
      ]);
    })
    .then((optionsPages) => {
      const pages = optionsPages.map((p) => p.map((o) => o.id));
      const hasDuplicates = pages[0].some((o) => pages[1].includes(o));

      t.deepEqual(
        optionsPages[0][0].createdAt,
        now,
        "created time should be now"
      );
      t.equal(pages.length, 2, "should have two pages");
      t.equal(pages[0].length, 10, "each page should have 10 options");
      t.equal(
        hasDuplicates,
        false,
        "there should be no duplicates across pages"
      );
    });
});
