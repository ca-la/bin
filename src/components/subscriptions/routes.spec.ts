import { sandbox, test, Test } from '../../test-helpers/fresh';
import { post } from '../../test-helpers/http';
import * as MailChimp from '../../services/mailchimp';
import * as ApprovalService from '../approved-signups/services/find-or-create';
import { MAILCHIMP_LIST_ID_DESIGNERS, MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS } from '../../config';

test('POST /subscriptions/designers creates a designer subscription', async (t: Test) => {
  const subscribeStub = sandbox().stub(MailChimp, 'subscribe').resolves();
  const approvalStub = sandbox().stub(ApprovalService, 'default').resolves();

  const [response, body] = await post('/subscriptions/designers', {
    body: {
      brandInstagram: 'thisiscala',
      email: 'foo@example.com',
      firstName: 'CA',
      howManyUnits: '150+',
      language: 'TypeScript',
      lastName: 'LA',
      readyForProduction: 'YES',
      source: 'homepage-overlay'
    }
  });

  t.equal(subscribeStub.callCount, 1, 'Calls mailchimp');
  t.equal(approvalStub.callCount, 1, 'Calls the approval creation function');
  t.true(approvalStub.calledWith({
    email: 'foo@example.com',
    firstName: 'CA',
    lastName: 'LA'
  }), 'Calls with the expected arguments');
  t.true(subscribeStub.calledWith(MAILCHIMP_LIST_ID_DESIGNERS, 'foo@example.com', {
    FNAME: 'CA',
    HOWMANYUNI: '150+',
    INSTA: 'thisiscala',
    LANGUAGE: 'TypeScript',
    LNAME: 'LA',
    READYFORPR: 'YES',
    READYTOGO: undefined,
    SOURCE: 'homepage-overlay'
  }), 'Calls with the expected arguments');

  t.equal(response.status, 201, 'Returns with success');
  t.deepEqual(body, { success: true }, 'Returns a success body');

  const [badResponse, badBody] = await post('/subscriptions/designers', {
    body: {
      foo: 'bar'
    }
  });

  t.equal(badResponse.status, 400, 'Fails on bad body');
  t.equal(badBody.message, 'Missing required information', 'Returns error message');
});

test('POST /subscriptions/designers creates an unqualified designer sub', async (t: Test) => {
  const subscribeStub = sandbox().stub(MailChimp, 'subscribe').resolves();
  const approvalStub = sandbox().stub(ApprovalService, 'default').resolves();

  const [response, body] = await post('/subscriptions/designers', {
    body: {
      brandInstagram: 'thisiscala',
      email: 'foo@example.com',
      firstName: 'CA',
      howManyUnits: '0-10',
      language: 'TypeScript',
      lastName: 'LA',
      readyForProduction: 'NO',
      source: 'homepage-overlay'
    }
  });

  t.equal(subscribeStub.callCount, 1, 'Calls mailchimp');
  t.equal(approvalStub.callCount, 0, 'Calls the approval creation function');
  t.true(subscribeStub.calledWith(MAILCHIMP_LIST_ID_DESIGNERS, 'foo@example.com', {
    FNAME: 'CA',
    HOWMANYUNI: '0-10',
    INSTA: 'thisiscala',
    LANGUAGE: 'TypeScript',
    LNAME: 'LA',
    READYFORPR: 'NO',
    READYTOGO: undefined,
    SOURCE: 'homepage-overlay'
  }), 'Calls with the expected arguments');

  t.equal(response.status, 201, 'Returns with success');
  t.deepEqual(body, { success: true }, 'Returns a success body');
});

test('POST /subscriptions/production-partners creates a partner subscription', async (t: Test) => {
  const subscribeStub = sandbox().stub(MailChimp, 'subscribe').resolves();

  const [response, body] = await post('/subscriptions/production-partners', {
    body: {
      email: 'foo@example.com',
      language: 'TypeScript',
      name: 'CA LA',
      source: 'homepage-overlay'
    }
  });

  t.equal(subscribeStub.callCount, 1, 'Calls mailchimp');
  t.true(subscribeStub.calledWith(MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS, 'foo@example.com', {
    LANGUAGE: 'TypeScript',
    NAME: 'CA LA',
    SOURCE: 'homepage-overlay',
    WEB: undefined
  }), 'Calls with the expected arguments');

  t.equal(response.status, 201, 'Returns with success');
  t.deepEqual(body, { success: true }, 'Returns a success body');

  const [badResponse, badBody] = await post('/subscriptions/production-partners', {
    body: {
      foo: 'bar'
    }
  });

  t.equal(badResponse.status, 400, 'Fails on bad body');
  t.equal(badBody.message, 'Missing required information', 'Returns error message');
});
