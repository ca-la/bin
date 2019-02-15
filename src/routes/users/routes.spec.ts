import * as uuid from 'node-uuid';

import { sandbox, test, Test } from '../../test-helpers/fresh';
import { post } from '../../test-helpers/http';
import * as DuplicationService from '../../services/duplicate';
import MailChimp = require('../../services/mailchimp');

test('POST /users?initialDesigns= allows registration + design duplication', async (t: Test) => {
  const dOne = uuid.v4();
  const dTwo = uuid.v4();
  const dThree = uuid.v4();

  const mailchimpStub = sandbox().stub(MailChimp, 'subscribeToUsers').returns(Promise.resolve());
  const duplicationStub = sandbox()
    .stub(DuplicationService, 'duplicateDesigns')
    .callsFake(async (_: string, designIds: string[]): Promise<void> => {
      t.true(designIds.includes(dOne), 'Contains first design id');
      t.true(designIds.includes(dTwo), 'Contains second design id');
      t.true(designIds.includes(dThree), 'Contains third design id');
    });

  const [response, body] = await post(
    `/users?initialDesigns=${dOne}&initialDesigns=${dTwo}&initialDesigns=${dThree}`,
    {
      body: {
        email: 'user@example.com',
        name: 'Rick Owens',
        password: 'rick_owens_la_4_lyfe',
        phone: '323 931 4960',
        zip: '90038'
      }
    }
  );

  t.equal(response.status, 201, 'status=201');
  t.equal(body.name, 'Rick Owens');
  t.equal(body.email, 'user@example.com');
  t.equal(body.phone, '+13239314960');
  t.equal(body.password, undefined);
  t.equal(body.passwordHash, undefined);

  t.equal(duplicationStub.callCount, 1, 'Expect the duplication service to be called once');
  t.equal(mailchimpStub.callCount, 1, 'Expect mailchimp to be called once');
});
