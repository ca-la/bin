import { sandbox, test, Test } from '../../../../test-helpers/fresh';
import * as CollectionsDAO from '../../dao';
import * as StatusService from '../determine-submission-status';
import { fetchUncostedWithLabels } from './index';

test('fetchUncostedWithLabels empty case', async (t: Test) => {
  const findStub = sandbox()
    .stub(CollectionsDAO, 'findSubmittedButUnpaidCollections')
    .resolves([]);
  const statusStub = sandbox().stub(StatusService, 'determineSubmissionStatus');

  const result = await fetchUncostedWithLabels();

  t.deepEqual(result, [], 'Returns an empty list');
  t.equal(findStub.callCount, 1);
  t.equal(statusStub.callCount, 0);
});

test('fetchUncostedWithLabels returns a list of uncosted collections only', async (t: Test) => {
  const findStub = sandbox()
    .stub(CollectionsDAO, 'findSubmittedButUnpaidCollections')
    .resolves([
      { id: 'collection-one' },
      { id: 'collection-two' },
      { id: 'collection-three' }
    ]);
  const statusStub = sandbox()
    .stub(StatusService, 'determineSubmissionStatus')
    .callsFake(
      (collectionId: string): StatusService.CollectionSubmissionStatus => {
        if (collectionId === 'collection-two') {
          return {
            collectionId,
            isCosted: true,
            isPaired: false,
            isQuoted: false,
            isSubmitted: true,
            pricingExpiresAt: new Date('2019-04-20')
          };
        }

        return {
          collectionId,
          isCosted: false,
          isPaired: false,
          isQuoted: false,
          isSubmitted: true,
          pricingExpiresAt: null
        };
      }
    );

  const result = await fetchUncostedWithLabels();

  t.deepEqual(
    result,
    [
      { id: 'collection-one', label: 'Needs Costing' },
      { id: 'collection-three', label: 'Needs Costing' }
    ],
    'Returns only the collections that do not have costing but have been submitted'
  );
  t.equal(findStub.callCount, 1);
  t.equal(statusStub.callCount, 3);
});
