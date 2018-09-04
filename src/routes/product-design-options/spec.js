'use strict';

const uuid = require('node-uuid');

const ProductDesignOptionsDAO = require('../../dao/product-design-options');
const createUser = require('../../test-helpers/create-user');
const {
  authHeader, del, post
} = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

test('POST /product-design-options/', (t) => {
  let sessionId;
  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      const productDesignOptions = {
        type: 'test',
        title: 'test',
        userId: user.id
      };
      return post('/product-design-options/', {
        headers: authHeader(sessionId),
        body: productDesignOptions
      });
    })
    .then(([response]) => {
      t.equal(response.status, 201);
    });
});

test('DELETE /product-design-options/:id', (t) => {
  let sessionId;
  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      const productDesignOptions = {
        isBuiltinOption: true,
        type: 'test',
        title: 'test',
        userId: user.id
      };
      return ProductDesignOptionsDAO.create(productDesignOptions);
    })
    .then(({ id }) => {
      return del(`/product-design-options/${id}`, {
        headers: authHeader(sessionId)
      });
    })
    .then(([response]) => {
      t.equal(response.status, 204);
    });
});

test('DELETE /product-design-options/:id on bad id returns 404', (t) => {
  let sessionId;
  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      const productDesignOptions = {
        isBuiltinOption: true,
        type: 'test',
        title: 'test',
        userId: user.id
      };
      return ProductDesignOptionsDAO.create(productDesignOptions);
    })
    .then(() => {
      const fakeId = uuid.v4();
      return del(`/product-design-options/${fakeId}`, {
        headers: authHeader(sessionId)
      });
    })
    .then(([response]) => {
      t.equal(response.status, 404);
    });
});

test('DELETE /product-design-options/:id on deleted id returns 404', (t) => {
  let sessionId;
  let optionsId;

  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      const productDesignOptions = {
        isBuiltinOption: true,
        type: 'test',
        title: 'test',
        userId: user.id
      };
      return ProductDesignOptionsDAO.create(productDesignOptions);
    })
    .then(({ id }) => {
      optionsId = id;
      return del(`/product-design-options/${optionsId}`, {
        headers: authHeader(sessionId)
      });
    })
    .then(() => {
      return del(`/product-design-options/${optionsId}`, {
        headers: authHeader(sessionId)
      });
    })
    .then(([response]) => {
      t.equal(response.status, 404);
    });
});
