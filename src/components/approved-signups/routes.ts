import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import InvalidDataError = require('../../errors/invalid-data');
import filterError = require('../../services/filter-error');
import requireAdmin = require('../../middleware/require-admin');
import { ApprovedSignup } from './domain-object';
import { create, findById } from './dao';
import { hasProperties } from '../../services/require-properties';
import { MAGIC_HOST, MAILCHIMP_LIST_ID_DESIGNERS, STUDIO_HOST } from '../../config';
import * as MailChimp from '../../services/mailchimp';

const router = new Router();

function isUnsavedApprovedSignup(data: object): data is Unsaved<ApprovedSignup> {
  return hasProperties(
    data,
    'email',
    'firstName',
    'lastName'
  );
}

function* createApproval(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { body } = this.request;

  if (body && isUnsavedApprovedSignup(body)) {
    const approval = yield create({
      consumedAt: null,
      createdAt: new Date(),
      id: uuid.v4(),
      ...body
    }).catch(
      filterError(InvalidDataError, (err: Error) => this.throw(400, err))
    );

    try {
      yield MailChimp.addOrUpdateListMember(MAILCHIMP_LIST_ID_DESIGNERS, approval.email, {
        APPROVED: 'TRUE',
        FNAME: approval.firstName,
        INSTA: undefined,
        LANGUAGE: 'en',
        LNAME: approval.lastName,
        MANAPPR: 'TRUE',
        REGLINK: `${STUDIO_HOST}/register?approvedSignupId=${approval.id}`,
        SOURCE: MAGIC_HOST
      });
    } catch (error) {
      this.throw(400, error.message);
    }

    this.status = 201;
    this.body = approval;
  } else {
    this.throw(400, 'Request does not match the Approved Signup properties.');
  }
}

function* findApproval(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { approvedSignupId } = this.params;
  const approvedSignup = yield findById(approvedSignupId);

  if (!approvedSignup) {
    this.throw(404, `Approved signup not found for id ${approvedSignupId}.`);
  }

  this.status = 200;
  this.body = approvedSignup;
}

router.post('/', requireAdmin, createApproval);
router.get('/:approvedSignupId', findApproval);

export default router.routes();
