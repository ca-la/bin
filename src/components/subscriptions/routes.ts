import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as MailChimp from '../../services/mailchimp';
import {
  MAILCHIMP_LIST_ID_DESIGNERS,
  MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS,
  STUDIO_HOST
} from '../../config';
import { hasProperties } from '../../services/require-properties';

import isApprovable from '../approved-signups/services/is-approvable';
import findOrCreateSignup from '../approved-signups/services/find-or-create';
import { ApprovedSignup } from '../approved-signups/domain-object';

const router = new Router();

interface DesignerSubscription {
  brandInstagram: string;
  email: string;
  howManyUnitsPerStyle?: string;
  firstName: string;
  language: string;
  lastName: string;
  source: string;
}

function isDesignerSubscription(
  candidate: object
): candidate is DesignerSubscription {
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

function* createDesignerSubscription(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { body } = this.request;
  if (!body || !isDesignerSubscription(body)) {
    this.throw(400, 'Missing required information');
    return;
  }

  const {
    brandInstagram,
    email,
    firstName,
    howManyUnitsPerStyle,
    language,
    lastName,
    source
  } = body;
  const isApproved = isApprovable(howManyUnitsPerStyle || '');
  let registrationLink: string | undefined;

  if (isApproved) {
    const signup: ApprovedSignup = yield findOrCreateSignup({
      consumedAt: null,
      email,
      firstName,
      isManuallyApproved: false,
      lastName
    });
    registrationLink = `${STUDIO_HOST}/register?approvedSignupId=${signup.id}`;
  }

  try {
    yield MailChimp.addOrUpdateListMember(MAILCHIMP_LIST_ID_DESIGNERS, email, {
      APPROVED: isApproved ? 'TRUE' : 'FALSE',
      FNAME: firstName,
      HOWMANYUNI: howManyUnitsPerStyle,
      INSTA: brandInstagram,
      LANGUAGE: language,
      LNAME: lastName,
      MANAPPR: undefined,
      REGLINK: registrationLink,
      SOURCE: source
    });
  } catch (error) {
    this.throw(400, error.message);
  }

  this.status = 201;
  this.body = {
    registrationLink,
    success: true
  };
}

interface PartnerSubscription {
  email: string;
  language: string;
  name: string;
  source: string;
  website?: string;
}

function isPartnerSubscription(
  candidate: object
): candidate is PartnerSubscription {
  return hasProperties(candidate, 'email', 'language', 'name', 'source');
}

function* createPartnerSubscription(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { body } = this.request;
  if (!body || !isPartnerSubscription(body)) {
    this.throw(400, 'Missing required information');
    return;
  }

  const { email, language, name, source, website } = body;

  try {
    yield MailChimp.addOrUpdateListMember(
      MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS,
      email,
      {
        LANGUAGE: language,
        NAME: name,
        SOURCE: source,
        WEB: website
      }
    );
  } catch (error) {
    this.throw(400, error.message);
  }

  this.status = 201;
  this.body = { success: true };
}

router.post('/designers', createDesignerSubscription);
router.post('/production-partners', createPartnerSubscription);

export default router.routes();
