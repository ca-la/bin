'use strict';

const Router = require('koa-router');

const filterError = require('../../services/filter-error');
const DesignersDAO = require('../../dao/designers');
const InvalidDataError = require('../../errors/invalid-data');

const router = new Router();

/**
 * GET /designers
 */
function* getList() {
  this.body = yield DesignersDAO.getList();
  this.status = 200;
}

/**
 * GET /designers/:designerId
 */
function* getById() {
  const designer = yield DesignersDAO.getById(this.params.designerId).catch(
    filterError(InvalidDataError, err => this.throw(404, err.message))
  );

  this.body = designer;
  this.status = 200;
}

router.get('/', getList);
router.get('/:designerId', getById);

module.exports = router.routes();
