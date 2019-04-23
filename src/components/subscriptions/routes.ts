import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as MailChimp from '../../services/mailchimp';
import { MAILCHIMP_LIST_ID_DESIGNERS, MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS } from '../../config';
import { hasProperties } from '../../services/require-properties';

import isApprovable from '../approved-signups/services/is-approvable';
import findOrCreateSignup from '../approved-signups/services/find-or-create';

const router = new Router();

interface DesignerSubscription {
  brandInstagram: string;
  email: string;
  howManyUnits?: string;
  firstName: string;
  language: string;
  lastName: string;
  readyForProduction?: string;
  readyToGo?: string;
  source: string;
}

function isDesignerSubscription(candidate: object): candidate is DesignerSubscription {
  return hasProperties(
    candidate,
    'brandInstagram',
    'email',
    'firstName',
    'language',
    'lastName',
    'source'
  );
}

function* createDesignerSubscription(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { body } = this.request;
  if (!body || !isDesignerSubscription(body)) {
    this.throw(400, 'Missing required information');
    return;
  }

  const {
    brandInstagram,
    email,
    firstName,
    howManyUnits,
    language,
    lastName,
    readyForProduction,
    readyToGo,
    source
  } = body;

  if (isApprovable(howManyUnits || '', readyForProduction || '')) {
    yield findOrCreateSignup({
      email,
      firstName,
      lastName
    });
  }

  try {
    yield MailChimp.subscribe(MAILCHIMP_LIST_ID_DESIGNERS, email, {
      FNAME: firstName,
      HOWMANYUNI: howManyUnits,
      INSTA: brandInstagram,
      LANGUAGE: language,
      LNAME: lastName,
      READYFORPR: readyForProduction,
      READYTOGO: readyToGo,
      SOURCE: source
    });
  } catch (error) {
    this.throw(400, error.message);
  }

  this.status = 201;
  this.body = { success: true };
}

interface PartnerSubscription {
  email: string;
  language: string;
  name: string;
  source: string;
  website?: string;
}

function isPartnerSubscription(candidate: object): candidate is PartnerSubscription {
  return hasProperties(
    candidate,
    'email',
    'language',
    'name',
    'source'
  );
}

function* createPartnerSubscription(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { body } = this.request;
  if (!body || !isPartnerSubscription(body)) {
    this.throw(400, 'Missing required information');
    return;
  }

  const {
    email,
    language,
    name,
    source,
    website
  } = body;

  try {
    yield MailChimp.subscribe(MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS, email, {
      LANGUAGE: language,
      NAME: name,
      SOURCE: source,
      WEB: website
    });
  } catch (error) {
    this.throw(400, error.message);
  }

  this.status = 201;
  this.body = { success: true };
}

router.post('/designers', createDesignerSubscription);
router.post('/production-partners', createPartnerSubscription);

export default router.routes();
