import { sandbox, test, Test } from '../../test-helpers/fresh';
import { post } from '../../test-helpers/http';
import * as MailChimp from '../../services/mailchimp';
import {
  MAILCHIMP_LIST_ID_DESIGNERS,
  MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS
} from '../../config';

test('POST /newsletter-subscriptions/designers creates a designer subscription', async (t: Test) => {
  const subscribeStub = sandbox()
    .stub(MailChimp, 'addOrUpdateListMember')
    .resolves();

  const [response, body] = await post('/newsletter-subscriptions/designers', {
    body: {
      brandInstagram: 'thisiscala',
      email: 'foo@example.com',
      firstName: 'CA',
      howManyUnitsPerStyle: '150_PLUS',
      language: 'TypeScript',
      lastName: 'LA',
      source: 'homepage-overlay'
    }
  });

  t.equal(subscribeStub.callCount, 1, 'Calls mailchimp');
  t.true(
    subscribeStub.calledWith(MAILCHIMP_LIST_ID_DESIGNERS, 'foo@example.com', {
      FNAME: 'CA',
      HOWMANYUNI: '150_PLUS',
      INSTA: 'thisiscala',
      LANGUAGE: 'TypeScript',
      LNAME: 'LA',
      MANAPPR: undefined,
      SOURCE: 'homepage-overlay'
    }),
    'Calls with the expected arguments'
  );

  t.equal(response.status, 201, 'Returns with success');
  t.deepEqual(
    body,
    {
      success: true
    },
    'Returns a success body with a registration link'
  );

  const [badResponse, badBody] = await post(
    '/newsletter-subscriptions/designers',
    {
      body: {
        foo: 'bar'
      }
    }
  );

  t.equal(badResponse.status, 400, 'Fails on bad body');
  t.equal(
    badBody.message,
    'Missing required information',
    'Returns error message'
  );
});

test('POST /newsletter-subscriptions/designers creates an unqualified designer sub', async (t: Test) => {
  const subscribeStub = sandbox()
    .stub(MailChimp, 'addOrUpdateListMember')
    .resolves();

  const [response, body] = await post('/newsletter-subscriptions/designers', {
    body: {
      brandInstagram: 'thisiscala',
      email: 'foo@example.com',
      firstName: 'CA',
      howManyUnitsPerStyle: '0_TO_10',
      language: 'TypeScript',
      lastName: 'LA',
      source: 'homepage-overlay'
    }
  });

  t.equal(subscribeStub.callCount, 1, 'Calls mailchimp');
  t.true(
    subscribeStub.calledWith(MAILCHIMP_LIST_ID_DESIGNERS, 'foo@example.com', {
      FNAME: 'CA',
      HOWMANYUNI: '0_TO_10',
      INSTA: 'thisiscala',
      LANGUAGE: 'TypeScript',
      LNAME: 'LA',
      MANAPPR: undefined,
      SOURCE: 'homepage-overlay'
    }),
    'Calls with the expected arguments'
  );

  t.equal(response.status, 201, 'Returns with success');
  t.deepEqual(
    body,
    { success: true },
    'Returns a success body with no registration link'
  );
});

test('POST /newsletter-subscriptions/production-partners creates a partner subscription', async (t: Test) => {
  const subscribeStub = sandbox()
    .stub(MailChimp, 'addOrUpdateListMember')
    .resolves();

  const [response, body] = await post(
    '/newsletter-subscriptions/production-partners',
    {
      body: {
        email: 'foo@example.com',
        language: 'TypeScript',
        name: 'CA LA',
        source: 'homepage-overlay'
      }
    }
  );

  t.equal(subscribeStub.callCount, 1, 'Calls mailchimp');
  t.true(
    subscribeStub.calledWith(
      MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS,
      'foo@example.com',
      {
        LANGUAGE: 'TypeScript',
        NAME: 'CA LA',
        SOURCE: 'homepage-overlay',
        WEB: undefined
      }
    ),
    'Calls with the expected arguments'
  );

  t.equal(response.status, 201, 'Returns with success');
  t.deepEqual(body, { success: true }, 'Returns a success body');

  const [badResponse, badBody] = await post(
    '/newsletter-subscriptions/production-partners',
    {
      body: {
        foo: 'bar'
      }
    }
  );

  t.equal(badResponse.status, 400, 'Fails on bad body');
  t.equal(
    badBody.message,
    'Missing required information',
    'Returns error message'
  );
});
