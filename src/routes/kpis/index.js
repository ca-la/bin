'use strict';

const Router = require('koa-router');

const db = require('../../services/db');
const requireAdmin = require('../../middleware/require-admin');

const router = new Router();

// The number of users that signed up during this time
async function getUserCount(startDate, endDate) {
  const result = await db.raw(`
    select count(*) from users
      where created_at::date >= ?
      and created_at::date <= ?
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

// The number of designs that were created during this time
async function getDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(*) from product_designs
      where created_at::date >= ?
      and created_at::date <= ?
      and deleted_at IS NULL
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

// The number of designs that were submitted during this time
async function getSubmittedDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(design_id)) from product_design_status_updates
      where created_at::date >= ?
      and created_at::date <= ?
      and new_status = 'IN_REVIEW'
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

// The number of designs that were approved by CALA to start development during this time
async function getApprovedDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(design_id)) from product_design_status_updates
      where created_at::date >= ?
      and created_at::date <= ?
      and new_status = 'NEEDS_DEVELOPMENT_PAYMENT';
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

// The number of designs that moved into non-review/development phases during this time
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

// The total of all the invoices paid during this time
async function getPaidInvoiceAmountCents(startDate, endDate) {
  const result = await db.raw(`
    select coalesce(sum(total_cents), 0) as sum from invoice_with_payments
      where paid_at::date >= ?
      and paid_at::date <= ?
  `, [startDate, endDate]);

  return parseInt(result.rows[0].sum, 10);
}

// The number of partners that signed up during this time
async function getPartnerCount(startDate, endDate) {
  const result = await db.raw(`
    select count(*) from users
      where created_at::date >= ?
      and created_at::date <= ?
      and role = 'PARTNER'
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

// The number of designs that were paid for during this time
async function getPaidDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select
      count(distinct i.design_id)
    from invoice_with_payments as i
    where (
      select count(i2.id) from invoice_with_payments as i2
      where i2.design_id = i.design_id
      and i2.paid_at is not null
      and i2.id != i.id
    ) = 0
    and i.paid_at::date >= ?
    and i.paid_at::date <= ?;
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

// The number of unique designers who paid for their first design during this time
async function getPaidDesignerCount(startDate, endDate) {
  const result = await db.raw(`
    select
      count(distinct d.user_id)
    from invoice_with_payments as i
    left join product_designs as d
      on d.id = i.design_id
    where (
      select count(i2.id) from invoice_with_payments as i2
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

// The number of production partners who added pricing during this time
async function getProductionParnerCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(vendor_user_id)) from production_prices
      where created_at::date >= ?
      and created_at::date <= ?
      and (service_id = 'PRODUCTION' OR service_id = 'SAMPLING')
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

// The number of designs that moved into a development-related phase during this time
async function getInDevelopmentDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(design_id)) from product_design_status_updates
      where created_at::date >= ?
      and created_at::date <= ?
      and (new_status = 'DEVELOPMENT'
        OR new_status = 'SAMPLE_PRODUCTION'
        OR new_status = 'SAMPLE_REVIEW')
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

// The number of designs that moved into a production-related phase during this time
async function getInProductionDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(design_id)) from product_design_status_updates
      where created_at::date >= ?
      and created_at::date <= ?
      and (new_status = 'PRE_PRODUCTION'
        OR new_status = 'PRODUCTION'
        OR new_status = 'NEEDS_FULFILLMENT_PAYMENT')
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

// The sum of all DEVELOPMENT invoices paid during this time period
async function getPaidDevelopmentAmountCents(startDate, endDate) {
  const result = await db.raw(`
    select coalesce(sum(total_cents), 0) as sum from invoice_with_payments
      where paid_at::date >= ?
      and paid_at::date <= ?
      and design_status_id = 'NEEDS_DEVELOPMENT_PAYMENT'
  `, [startDate, endDate]);

  return parseInt(result.rows[0].sum, 10);
}

// The sum of all PRODUCTION invoices paid during this time period
async function getPaidProductionAmountCents(startDate, endDate) {
  const result = await db.raw(`
    select coalesce(sum(total_cents), 0) as sum from invoice_with_payments
      where paid_at::date >= ?
      and paid_at::date <= ?
      and design_status_id = 'NEEDS_PRODUCTION_PAYMENT'
  `, [startDate, endDate]);

  return parseInt(result.rows[0].sum, 10);
}

// The number of unique designers who paid for their SECOND design during this
// time - i.e. have become repeat customers
async function getFirstTimeRepeatDesignerCount(startDate, endDate) {
  const result = await db.raw(`
    select
      count(distinct d.user_id)
    from invoice_with_payments as i
    left join product_designs as d
      on d.id = i.design_id
    where (
      select count(distinct(i2.design_id))
        from invoice_with_payments as i2
      left join product_designs as d2
        on d2.id = i2.design_id
      where d2.user_id = d.user_id
      and i2.paid_at::date < i.paid_at
      and i2.design_id != i.design_id
    ) = 1
    and i.paid_at::date >= ?
    and i.paid_at::date <= ?;
  `, [startDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

// The number of total units (not designs) paid for during this time
async function getPaidUnitsCount(startDate, endDate) {
  const result = await db.raw(`
    select
      coalesce(sum(v.units_to_produce), 0)
    from product_design_variants as v
    where v.design_id in (
      select distinct(i.design_id)
      from invoice_with_payments as i
      where (
        select count(i2.id) from invoice_with_payments as i2
        where i2.design_id = i.design_id
        and i2.paid_at is not null
        and i2.id != i.id
      ) = 0
      and i.paid_at::date >= ?
      and i.paid_at::date <= ?
    );
  `, [startDate, endDate]);

  return parseInt(result.rows[0].coalesce, 10);
}

// The number of designs that - during this time - had been paid for but were not
// yet completed. Essentially how many we're "working on"
async function getPaidButIncompleteDesignCount(startDate, endDate) {
  const result = await db.raw(`
    select count(distinct(design_id)) from product_design_status_updates as ru
      where ru.created_at::date <= ?
      and ru.new_status = 'IN_REVIEW'
      and (
        select count(*) from product_design_status_updates as cu
        where cu.created_at::date <= ?
        and cu.new_status = 'COMPLETE'
      ) = 0;
  `, [endDate, endDate]);

  return parseInt(result.rows[0].count, 10);
}

function* getMetrics() {
  const { startDate, endDate } = this.query;
  this.assert(startDate && endDate, 400, 'Must provide start & end date');

  this.body = {
    approvedDesignCount: yield getApprovedDesignCount(startDate, endDate),
    designCount: yield getDesignCount(startDate, endDate),
    firstTimeRepeatDesignerCount: yield getFirstTimeRepeatDesignerCount(startDate, endDate),
    inDevelopmentDesignCount: yield getInDevelopmentDesignCount(startDate, endDate),
    inProductionDesignCount: yield getInProductionDesignCount(startDate, endDate),
    otherStatusDesignCount: yield getOtherStatusDesignCount(startDate, endDate),
    paidDesignCount: yield getPaidDesignCount(startDate, endDate),
    paidDesignerCount: yield getPaidDesignerCount(startDate, endDate),
    paidDevelopmentAmountCents: yield getPaidDevelopmentAmountCents(startDate, endDate),
    paidInvoiceAmountCents: yield getPaidInvoiceAmountCents(startDate, endDate),
    paidProductionAmountCents: yield getPaidProductionAmountCents(startDate, endDate),
    paidUnitsCount: yield getPaidUnitsCount(startDate, endDate),
    paidButIncompleteDesignCount: yield getPaidButIncompleteDesignCount(startDate, endDate),
    partnerCount: yield getPartnerCount(startDate, endDate),
    productionPartnerCount: yield getProductionParnerCount(startDate, endDate),
    submittedDesignCount: yield getSubmittedDesignCount(startDate, endDate),
    userCount: yield getUserCount(startDate, endDate)
  };

  this.status = 200;
}

router.get('/', requireAdmin, getMetrics);

module.exports = router.routes();
