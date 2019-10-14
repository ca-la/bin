import * as Koa from 'koa';
import * as Router from 'koa-router';
import { hasProperties } from '@cala/ts-lib';
import Knex = require('knex');

import * as db from '../../services/db';
import MonthlySalesReport from './domain-object';
import * as ReportsDAO from './dao';
import requireAdmin = require('../../middleware/require-admin');
import { immediatelySendMonthlySalesReport } from '../../services/create-notifications/monthly-sales-report';

const router = new Router();

function isMonthlyReport(body: any): body is MonthlySalesReport {
  return hasProperties(
    body,
    'id',
    'createdAt',
    'createdBy',
    'designerId',
    'availableCreditCents',
    'costOfReturnedGoodsCents',
    'financingBalanceCents',
    'financingPrincipalPaidCents',
    'fulfillmentCostCents',
    'paidToDesignerCents',
    'revenueCents',
    'revenueSharePercentage'
  );
}

function* createMonthly(
  this: Koa.Application.Context
): AsyncIterableIterator<MonthlySalesReport[]> {
  const { body } = this.request;

  if (!isMonthlyReport(body)) {
    return this.throw(400, 'Missing required properties');
  }

  const report = yield db.transaction(
    async (trx: Knex.Transaction): Promise<MonthlySalesReport> => {
      return ReportsDAO.create(body, trx);
    }
  );

  yield immediatelySendMonthlySalesReport(report);

  this.body = report;
  this.status = 201;
}

router.post('/monthly', requireAdmin, createMonthly);

export default router.routes();
