'use strict';

const Router = require('koa-router');

const db = require('../../services/db');
const requireAdmin = require('../../middleware/require-admin');

const router = new Router();

async function getUserCount(startDate, endDate) {
  const result = await db.raw(`
    select count(*) from users
      where created_at >= ?
      and created_at <= ?
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(*) from product_designs
      where created_at >= ?
      and created_at <= ?
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getSubmittedDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(*) from product_designs
      where created_at >= ?
      and created_at <= ?
      and status != 'DRAFT'
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getApprovedDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(*) from product_designs
      where created_at >= ?
      and created_at <= ?
      and status != 'DRAFT'
      and status != 'IN_REVIEW'
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getPaidInvoiceAmountCents(startDate, endDate) {
  const result = await db.raw(`
    select sum(total_cents) from invoices
      where paid_at >= ?
      and paid_at <= ?
  `, [startDate, endDate]);

  return parseInt(result.rows[0].sum, 10);
}

function* getMetrics() {
  const { startDate, endDate } = this.query;
  this.assert(startDate && endDate, 400, 'Must provide start & end date');

  this.body = {
    userCount: yield getUserCount(startDate, endDate),
    designCount: yield getDesignCount(startDate, endDate),
    submittedDesignCount: yield getSubmittedDesignCount(startDate, endDate),
    approvedDesignCount: yield getApprovedDesignCount(startDate, endDate),
    paidInvoiceAmountCents: yield getPaidInvoiceAmountCents(startDate, endDate)
  };

  this.status = 200;
}

router.get('/', requireAdmin, getMetrics);

module.exports = router.routes();
