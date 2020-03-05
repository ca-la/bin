import { test, Test } from '../../test-helpers/fresh';
import createUser from '../../test-helpers/create-user';

import {
  authHeader,
  del,
  get,
  patch,
  post,
  put
} from '../../test-helpers/http';

test('GET /addresses returns a 401 when called without auth', async (t: Test) => {
  const [response, body] = await get('/addresses');
  t.equal(response.status, 401);
  t.equal(body.message, 'Authorization is required to access this resource');
});

test('GET /addresses returns a 403 when called with someone elses user ID', async (t: Test) => {
  const { session } = await createUser();
  const [response, body] = await get('/addresses?userId=123', {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 403);
  t.equal(body.message, 'You can only request addresses for your own user');
});

test('GET /addresses returns a list of addresses', async (t: Test) => {
  const { user, session, address } = await createUser({ withAddress: true });
  const [response, body] = await get(`/addresses?userId=${user.id}`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, address.id);
});

test('POST /addresses returns a 401 when called without auth', async (t: Test) => {
  const [response, body] = await get(`/addresses`);
  t.equal(response.status, 401);
  t.equal(body.message, 'Authorization is required to access this resource');
});

test('POST /addresses returns a 400 when called with missing data', async (t: Test) => {
  const { session } = await createUser();
  const [response, body] = await post('/addresses', {
    headers: authHeader(session.id),
    body: {
      companyName: '',
      addressLine1: '',
      city: '',
      region: '',
      country: '',
      postCode: ''
    }
  });
  t.equal(response.status, 400);
  t.equal(body.message, 'Missing required information: Address Line 1');
});

test('POST /addresses creates and returns an address', async (t: Test) => {
  const { user, session } = await createUser();
  const [response, body] = await post('/addresses', {
    headers: authHeader(session.id),
    body: {
      companyName: 'CALA',
      addressLine1: '42 Wallaby Way',
      city: 'Sydney',
      region: 'NSW',
      country: 'Australia',
      postCode: 'RG41 2PE'
    }
  });

  t.equal(response.status, 201);
  t.equal(body.companyName, 'CALA');
  t.equal(body.userId, user.id);
});

const addressBlank = {
  companyName: 'CALA',
  addressLine1: '42 Wallaby Way',
  city: 'Sydney',
  region: 'NSW',
  country: 'Australia',
  postCode: 'RG41 2PE'
};

type RequestMethod = typeof patch;

interface BeforeItem {
  url: (beforeData: BeforeData) => string;
  method: RequestMethod;
  body: any;
}

interface BeforeData {
  [key: string]: any;
}

interface TestCase {
  title: string;
  route: {
    useAuth?: boolean;
    url: (beforeData: BeforeData) => string;
    method: RequestMethod;
    body?: any;
  };
  before?: BeforeData;
  expected: {
    status: number;
    body: (beforeData: BeforeData) => any;
  };
}

const testCases: TestCase[] = [
  {
    title: 'PATCH /addresses/:id returns a 404 when called with wrong id',
    route: {
      useAuth: true,
      url: (): string => '/addresses/50efbefe-bf3e-42fe-9dd4-413172158667',
      method: patch,
      body: { postCode: '123456' }
    },
    expected: {
      status: 404,
      body: (): any => ({ message: 'Not Found' })
    }
  },
  {
    title: 'PATCH /addresses/:id returns 401 when called without auth',
    before: {
      created: {
        url: (): string => '/addresses',
        method: post,
        body: addressBlank
      }
    },
    route: {
      url: ({ created }: BeforeData): string => `/addresses/${created!.id}`,
      method: patch,
      body: { postCode: '123456' }
    },
    expected: {
      status: 401,
      body: (): any => ({
        message: 'Authorization is required to access this resource'
      })
    }
  },
  {
    title: 'PATCH /addresses/:id patches and returns address',
    before: {
      created: {
        url: (): string => '/addresses',
        method: post,
        body: addressBlank
      }
    },
    route: {
      useAuth: true,
      url: ({ created }: BeforeData): string => `/addresses/${created.id}`,
      method: patch,
      body: { postCode: '123456' }
    },
    expected: {
      status: 200,
      body: ({ created }: BeforeData): any =>
        Object.assign({}, created, { postCode: '123456' })
    }
  },
  {
    title: 'DELETE /addresses/:id returns 401 when called without auth',
    before: {
      created: {
        url: (): string => '/addresses',
        method: post,
        body: addressBlank
      }
    },
    route: {
      url: ({ created }: BeforeData): string => `/addresses/${created.id}`,
      method: del
    },
    expected: {
      status: 401,
      body: (): any => ({
        message: 'Authorization is required to access this resource'
      })
    }
  },
  {
    title: 'DELETE /addresses/:id returns a 404 when called with wrong id',
    route: {
      useAuth: true,
      url: (): string => '/addresses/50efbefe-bf3e-42fe-9dd4-413172158667',
      method: del
    },
    expected: {
      status: 404,
      body: (): any => ({ message: 'Not Found' })
    }
  },
  {
    title: 'DELETE /addresses/:id deletes address',
    before: {
      created: {
        url: (): string => '/addresses',
        method: post,
        body: addressBlank
      }
    },
    route: {
      useAuth: true,
      url: ({ created }: BeforeData): string => `/addresses/${created.id}`,
      method: del
    },
    expected: {
      status: 204,
      body: (): any => ''
    }
  },
  {
    title: 'PUT /addresses/:id returns 401 when called without auth',
    before: {
      created: {
        url: (): string => '/addresses',
        method: post,
        body: addressBlank
      }
    },
    route: {
      url: ({ created }: BeforeData): string => `/addresses/${created.id}`,
      method: put
    },
    expected: {
      status: 401,
      body: (): any => ({
        message: 'Authorization is required to access this resource'
      })
    }
  },
  {
    title: 'PUT /addresses/:id restores deleted address',
    before: {
      created: {
        url: (): string => '/addresses',
        method: post,
        body: addressBlank
      },
      deleted: {
        url: ({ created }: BeforeData): string => `/addresses/${created!.id}`,
        method: del
      }
    },
    route: {
      useAuth: true,
      url: ({ created }: BeforeData): string => `/addresses/${created.id}`,
      method: put,
      body: addressBlank
    },
    expected: {
      status: 200,
      body: ({ created }: BeforeData): any => created
    }
  }
];

testCases.forEach(async (testCase: TestCase) => {
  test(testCase.title, async (t: Test) => {
    const { session } = await createUser();

    const beforeKeys = Object.keys(testCase.before || {});
    const beforeData: any = {};
    for (const key of beforeKeys) {
      const beforeItem: BeforeItem = testCase!.before![key]!;
      const [, beforeRequestBody] = await beforeItem.method(
        beforeItem.url(beforeData),
        {
          headers: authHeader(session.id),
          body: beforeItem.body
        }
      );
      beforeData[key] = beforeRequestBody;
    }
    const [response, body] = await testCase.route.method(
      testCase.route.url(beforeData),
      {
        headers: testCase.route.useAuth ? authHeader(session.id) : {},
        body: { ...testCase.route.body, deletedAt: null }
      }
    );

    t.equal(response.status, testCase.expected.status);
    t.deepEqual(body, testCase.expected.body(beforeData));
  });
});
