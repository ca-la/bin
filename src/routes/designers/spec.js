'use strict';

const Designer = require('../../domain-objects/designer');
const DesignersDAO = require('../../dao/designers');
const InvalidDataError = require('../../errors/invalid-data');
const { get } = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');

test('GET /designers lists designers', t => {
  sandbox()
    .stub(DesignersDAO, 'getList')
    .returns(
      Promise.resolve([
        new Designer({
          id: '123123',
          name: 'A Designer'
        }),
        new Designer({
          id: '456456',
          name: 'Another Designer'
        })
      ])
    );

  return get('/designers').then(([response, body]) => {
    t.equal(response.status, 200);
    t.equal(body.length, 2);
    t.equal(body[0].id, '123123');
    t.equal(body[1].id, '456456');
  });
});

test('GET /designers/:id returns a designer', t => {
  sandbox()
    .stub(DesignersDAO, 'getById')
    .returns(
      Promise.resolve(
        new Designer({
          id: '123123',
          name: 'A Designer'
        })
      )
    );

  return get('/designers/123123').then(([response, body]) => {
    t.equal(response.status, 200);
    t.equal(body.id, '123123');
    t.equal(body.name, 'A Designer');
  });
});

test('GET /designers/:id returns 404 when not found', t => {
  sandbox()
    .stub(DesignersDAO, 'getById')
    .callsFake(() => {
      const err = new InvalidDataError('Designer not found');
      return Promise.reject(err);
    });

  return get('/designers/123123').then(([response, body]) => {
    t.equal(response.status, 404);
    t.equal(body.message, 'Designer not found');
  });
});
