'use strict';

const Router = require('koa-router');

const db = require('../../services/db');
const requireAdmin = require('../../middleware/require-admin');

const router = new Router();

async function getUserCount(startDate, endDate) {
  const result = await db.raw(`
    select count(*) from users
      where created_at::date >= ?
      and created_at::date <= ?
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(*) from product_designs
      where created_at::date >= ?
      and created_at::date <= ?
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getSubmittedDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(design_id)) from product_design_status_updates
      where created_at::date >= ?
      and created_at::date <= ?
      and new_status = 'IN_REVIEW'
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getApprovedDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(design_id)) from product_design_status_updates
      where created_at::date >= ?
      and created_at::date <= ?
      and new_status = 'NEEDS_DEVELOPMENT_PAYMENT';
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getOtherStatusDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(design_id)) from product_design_status_updates
      where created_at::date >= ?
      and created_at::date <= ?
      and (
        new_status != 'IN_REVIEW' and
        new_status != 'NEEDS_DEVELOPMENT_PAYMENT'
      );
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}


async function getPaidInvoiceAmountCents(startDate, endDate) {
  const result = await db.raw(`
    select sum(total_cents) from invoices
      where paid_at::date >= ?
      and paid_at::date <= ?
  `, [startDate, endDate]);

  return parseInt(result.rows[0].sum, 10);
}

async function getPartnerCount(startDate, endDate) {
  const result = await db.raw(`
    select count(*) from users
      where created_at::date >= ?
      and created_at::date <= ?
      and role = 'PARTNER'
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getPaidDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(design_id)) from invoices
      where created_at::date >= ?
      and created_at::date <= ?
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getPaidDesignerCount(startDate, endDate) {
  const result = await db.raw(`
    select
      count(distinct d.user_id)
    from invoices as i
    left join product_designs as d
      on d.id = i.design_id
    where (
      select count(i2.id) from invoices as i2
      left join product_designs as d2
        on d2.id = i2.design_id
      where d2.user_id = d.user_id
      and i2.paid_at < ?
      and i2.id != i.id
    ) = 0
    and i.paid_at::date >= ?
    and i.paid_at::date <= ?;
  `, [startDate, startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

async function getProductionParnerCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(vendor_user_id)) from production_prices
      where created_at::date >= ?
      and created_at::date <= ?
      and (service_id = 'PRODUCTION' OR service_id = 'SAMPLING')
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

function* getMetrics() {
  const { startDate, endDate } = this.query;
  this.assert(startDate && endDate, 400, 'Must provide start & end date');

  this.body = {
    userCount: yield getUserCount(startDate, endDate),
    partnerCount: yield getPartnerCount(startDate, endDate),
    productionPartnerCount: yield getProductionParnerCount(startDate, endDate),
    designCount: yield getDesignCount(startDate, endDate),
    paidDesignCount: yield getPaidDesignCount(startDate, endDate),
    paidDesignerCount: yield getPaidDesignerCount(startDate, endDate),
    submittedDesignCount: yield getSubmittedDesignCount(startDate, endDate),
    approvedDesignCount: yield getApprovedDesignCount(startDate, endDate),
    otherStatusDesignCount: yield getOtherStatusDesignCount(startDate, endDate),
    paidInvoiceAmountCents: yield getPaidInvoiceAmountCents(startDate, endDate)
  };

  this.status = 200;
}

router.get('/', requireAdmin, getMetrics);

module.exports = router.routes();
