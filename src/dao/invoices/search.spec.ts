import { test, Test } from '../../test-helpers/fresh';
import { getInvoicesByUser } from './search';
import createUser = require('../../test-helpers/create-user');
import generateInvoice from '../../test-helpers/factories/invoice';

test('getInvoicesByUser returns a list of undeleted invoices', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  await generateInvoice();
  const { invoice: invoice1 } = await generateInvoice({ userId: user.id });
  const { invoice: invoice2 } = await generateInvoice({ userId: user.id });

  const result = await getInvoicesByUser({ userId: user.id });

  t.deepEqual(
    result,
    [invoice2, invoice1],
    'Returns a list of invoices for the user'
  );
});
