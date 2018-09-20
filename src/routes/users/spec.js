'use strict';

const createUser = require('../../test-helpers/create-user');
const InvalidDataError = require('../../errors/invalid-data');
const MailChimp = require('../../services/mailchimp');
const ScansDAO = require('../../dao/scans');
const SessionsDAO = require('../../dao/sessions');
const ShopifyClient = require('../../services/shopify');
const Twilio = require('../../services/twilio');
const UnassignedReferralCodesDAO = require('../../dao/unassigned-referral-codes');
const UsersDAO = require('../../dao/users');
const {
  get, post, put, authHeader
} = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');

const USER_DATA = Object.freeze({
  name: 'Q User',
  email: 'user@example.com',
  phone: '415 580 9925',
  zip: '94117',
  password: 'hunter2'
});

const ADDRESS_DATA = Object.freeze({
  companyName: 'CALA',
  addressLine1: '1025 Oak St',
  addressLine2: 'Apt B',
  city: 'San Francisco',
  region: 'CA',
  postCode: '94117',
  country: 'USA'
});

function stubUserDependencies() {
  sandbox().stub(MailChimp, 'subscribeToUsers').returns(Promise.resolve());
  sandbox().stub(UnassignedReferralCodesDAO, 'get').returns(Promise.resolve('ABC123'));
}

test('POST /users returns a 400 if user creation fails', (t) => {
  stubUserDependencies();

  sandbox().stub(UsersDAO, 'create').rejects(new InvalidDataError('Bad email'));

  return post('/users', { body: USER_DATA })
    .then(([response, body]) => {
      t.equal(response.status, 400, 'status=400');
      t.equal(body.message, 'Bad email');
    });
});

test('POST /users returns new user data', (t) => {
  stubUserDependencies();

  return post('/users', { body: USER_DATA })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.name, 'Q User');
      t.equal(body.email, 'user@example.com');
      t.equal(body.phone, '+14155809925');
      t.equal(body.password, undefined);
      t.equal(body.passwordHash, undefined);
    });
});

test('POST /users allows creating an address', (t) => {
  stubUserDependencies();

  const withAddress = Object.assign({}, USER_DATA, {
    address: ADDRESS_DATA
  });

  return post('/users', { body: withAddress })
    .then(([response, body]) => {
      t.equal(response.status, 201);
      t.equal(body.addresses.length, 1);
      t.equal(body.addresses[0].companyName, 'CALA');
    });
});

test('POST /users returns a session instead if requested', (t) => {
  stubUserDependencies();

  return post('/users?returnValue=session', { body: USER_DATA })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.userId.length, 36);
      t.equal(body.user.name, 'Q User');
    });
});

test('POST /users allows creating a scan', (t) => {
  stubUserDependencies();

  const withScan = Object.assign({}, USER_DATA, {
    scan: {
      type: 'HUMANSOLUTIONS',
      isComplete: true
    }
  });

  let userId;

  return post('/users', { body: withScan })
    .then(([response, body]) => {
      userId = body.id;
      t.equal(response.status, 201);
      return ScansDAO.findByUserId(userId);
    })
    .then((scans) => {
      t.equal(scans.length, 1);
      t.equal(scans[0].userId, userId);
      t.equal(scans[0].isComplete, true);
      t.equal(scans[0].type, 'HUMANSOLUTIONS');
    });
});


test('PUT /users/:id/password returns a 401 if unauthenticated', (t) => {
  return put('/users/123/password', { body: {} })
    .then(([response, body]) => {
      t.equal(response.status, 401);
      t.equal(body.message, 'Authorization is required to access this resource');
    });
});

test('PUT /users/:id/password returns a 403 if not the current user', (t) => {
  return createUser()
    .then(({ session }) => {
      return put('/users/123/password', {
        body: {},
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'You can only update your own user');
    });
});

test('PUT /users/:id/password updates the current user', (t) => {
  return createUser()
    .then(({ user, session }) => {
      return put(`/users/${user.id}/password`, {
        body: {
          password: 'hunter2'
        },
        headers: authHeader(session.id)
      });
    })
    .then(([response]) => {
      t.equal(response.status, 200);
    });
});

test('GET /users/:id/referral-count returns a 403 if not the current user', (t) => {
  return createUser()
    .then(({ session }) => {
      return get('/users/123/referral-count', {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'You can only get referral count for your own user');
    });
});

test('GET /users/:id/referral-count determines the current referral count', (t) => {
  sandbox().stub(ShopifyClient.prototype, 'getRedemptionCount').returns(Promise.resolve(10));

  return createUser()
    .then(({ user, session }) => {
      return get(`/users/${user.id}/referral-count`, {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.deepEqual(body, { count: 10, referralValueDollars: 50 });
      t.equal(ShopifyClient.prototype.getRedemptionCount.callCount, 1);
      t.equal(ShopifyClient.prototype.getRedemptionCount.lastCall.args[0], 'freebie');
    });
});

test('GET /users returns an empty array if referral code does not match a user', (t) => {
  return get('/users?referralCode=FOZO')
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.deepEqual(body, []);
    });
});

test('GET /users returns a user by referral code, case insensitive', (t) => {
  let userId;
  return createUser()
    .then(({ user }) => {
      userId = user.id;
      return get('/users?referralCode=FrEEbie');
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.length, 1);
      t.equal(body[0].id, userId);
    });
});

test('GET /users list returns 401 if not authorized', (t) => {
  return get('/users')
    .then(([response, body]) => {
      t.equal(response.status, 401);
      t.equal(body.message, 'Unauthorized');
    });
});

test('GET /users list returns 403 if logged in but not admin', (t) => {
  return createUser()
    .then(({ session }) => {
      return get('/users', {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'Forbidden');
    });
});


test('GET /users list returns a list of users if authorized', (t) => {
  let userId;

  return createUser({ role: 'ADMIN' })
    .then(({ user, session }) => {
      userId = user.id;
      return get('/users', {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.length, 1);
      t.equal(body[0].id, userId);
    });
});

test('GET /users/:id returns a user', (t) => {
  return createUser({ role: 'ADMIN' })
    .then(({ user, session }) => {
      return get(`/users/${user.id}`, {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.name, 'Q User');
    });
});

test('GET /users/email-availability/:email returns false when unavailable', (t) => {
  return createUser()
    .then(({ user }) => {
      return get(`/users/email-availability/${user.email}`);
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.deepEqual(body, { available: false, isTaken: true, isValid: true });
    });
});

test('GET /users/email-availability/:email returns true when available', (t) => {
  return get('/users/email-availability/fuz@buz.qux')
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.deepEqual(body, { available: true, isTaken: false, isValid: true });
    });
});

test('GET /users/email-availability/:email returns false when invalid', (t) => {
  return get('/users/email-availability/fizzbuzz')
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.deepEqual(body, { available: false, isTaken: false, isValid: false });
    });
});

test('PUT /users/:id returns a 401 if unauthenticated', (t) => {
  return put('/users/123', { body: {} })
    .then(([response, body]) => {
      t.equal(response.status, 401);
      t.equal(body.message, 'Authorization is required to access this resource');
    });
});

test('PUT /users/:id returns a 403 if not the current user', (t) => {
  return createUser()
    .then(({ session }) => {
      return put('/users/123', {
        body: {},
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'You can only update your own user');
    });
});

test('PUT /users/:id updates the current user', (t) => {
  return createUser()
    .then(({ user, session }) => {
      return put(`/users/${user.id}`, {
        body: {
          birthday: '2017-01-01'
        },
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.birthday, '2017-01-01');
    });
});

test('POST /users/:id/complete-sms-preregistration returns a 403 if not the current user', (t) => {
  return createUser()
    .then(({ session }) => {
      return post('/users/123/complete-sms-preregistration', {
        body: {},
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'You can only update your own user');
    });
});

test('POST /users/:id/complete-sms-preregistration returns a 400 if user is already registered', (t) => {
  const withAddress = Object.assign({}, USER_DATA, {
    address: ADDRESS_DATA
  });

  return createUser()
    .then(({ user, session }) => {
      return post(`/users/${user.id}/complete-sms-preregistration`, {
        body: withAddress,
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, "You've already completed your registration");
    });
});

test('POST /users/:id/complete-sms-preregistration completes a user', (t) => {
  const withAddress = Object.assign({}, USER_DATA, {
    address: ADDRESS_DATA
  });

  let user;

  sandbox().stub(ShopifyClient.prototype, 'updateCustomerByPhone').returns(Promise.resolve());
  sandbox().stub(Twilio, 'sendSMS').returns(Promise.resolve());

  return UsersDAO.createSmsPreregistration({
    name: 'D Money',
    phone: '415 580 9925',
    referralCode: '123123'
  })
    .then((_user) => {
      user = _user;
      return SessionsDAO.createForUser(user);
    })
    .then((session) => {
      return post(`/users/${user.id}/complete-sms-preregistration`, {
        body: withAddress,
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.addresses[0].addressLine1, '1025 Oak St');
      t.equal(body.name, 'Q User');
      t.equal(body.email, 'user@example.com');
    });
});
