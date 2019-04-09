import * as uuid from 'node-uuid';
import * as Knex from 'knex';
import { range } from 'lodash';
import * as rethrow from 'pg-rethrow';

import { FIT_CLIENT_HOST, MAGIC_HOST } from '../config';
import * as ScansDAO from '../dao/scans';
import * as FitPartnersDAO from '../dao/fit-partners';
import FitPartnerCustomer = require('../domain-objects/fit-partner-customer');
import first from '../services/first';
import * as db from '../services/db';
import Logger = require('../services/logger');

async function generateScans(): Promise<void> {
  const partnerId = process.argv[2];
  const desiredScanCount = Number(process.argv[3]);
  const addedScans: string[] = [];

  if (
    !partnerId ||
    !Number.isInteger(desiredScanCount) ||
    desiredScanCount < 1
  ) {
    throw new Error('Usage: generate-scans.ts [partner ID] [number of scans]');
  }

  const partner = await FitPartnersDAO.findById(partnerId);

  if (!partner) {
    throw new Error(`Could not find partner with ID ${partnerId}`);
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    for (const _ of range(0, desiredScanCount)) {
      // This is the customer of the partner, not the partner
      const customer = await db('fit_partner_customers')
        .insert({
          createdAt: new Date(),
          deletedAt: null,
          id: uuid.v4(),
          partnerId,
          shopifyUserId: 'NONE' // This value is non-null, but can't be an empty string
        }, '*')
        .transacting(trx)
        .then(first)
        .then((data: any) => new FitPartnerCustomer(data))
        .catch(rethrow);

      const scan = await ScansDAO.create(
        {
          fitPartnerCustomerId: customer.id,
          isComplete: false,
          isStarted: false,
          type: 'PHOTO'
        },
        trx
      );

      addedScans.push(scan.id);
    }

    if (addedScans.length !== desiredScanCount) {
      throw new Error(
        'Number of added scans does not equal the desired amount'
      );
    }

    const linkBaseUrl = partner.customFitDomain || FIT_CLIENT_HOST;
    // tslint:disable:no-console
    console.log('id,customer_link,magic_link');
    addedScans.forEach((scanId: string) => {
      console.log(
        `${scanId},${linkBaseUrl}/scans/${scanId},${MAGIC_HOST}/scans/${scanId}`
      );
    });
    // tslint:enable:no-console
  });
}

generateScans()
  .then(() => {
    process.exit(0);
  })
  .catch((err: Error) => {
    Logger.logServerError(err);
    process.exit(1);
  });
