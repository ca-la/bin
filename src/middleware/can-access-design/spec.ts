import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import * as API from '../../test-helpers/http';
import * as DesignsDAO from '../../components/product-designs/dao';

test('canDeleteDesign middleware', async (t: tape.Test) => {
  const { user } = await createUser();
  const { session: session2 } = await createUser();

  const design = await DesignsDAO.create({
    productType: 'HOODIE',
    title: 'Robert Mapplethorpe Hoodie',
    userId: user.id
  });

  const [validResponse] = await API.del(`/product-designs/${design.id}`, {
    headers: API.authHeader(session2.id)
  });
  t.equal(
    validResponse.status,
    403,
    'does not allow a stranger to delete a design'
  );
});
