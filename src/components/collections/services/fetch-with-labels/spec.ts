import { sandbox, test, Test } from '../../../../test-helpers/fresh';
import * as CollectionsDAO from '../../dao';
import * as StatusService from '../determine-submission-status';
import { fetchExpiredWithLabels, fetchUncostedWithLabels } from './index';

test('fetchUncostedWithLabels empty case', async (t: Test) => {
  const findStub = sandbox()
    .stub(CollectionsDAO, 'findSubmittedButUnpaidCollections')
    .resolves([]);
  const statusStub = sandbox().stub(StatusService, 'determineSubmissionStatus');

  const result = await fetchUncostedWithLabels();

  t.deepEqual(result, [], 'Returns an empty list');
  t.equal(findStub.callCount, 1);
  t.equal(statusStub.callCount, 1);
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
      (): StatusService.SubmissionStatusByCollection => {
        return {
          'collection-one': {
            collectionId: 'collection-one',
            isCosted: false,
            isPaired: false,
            isQuoted: false,
            isSubmitted: true,
            pricingExpiresAt: null
          },
          'collection-two': {
            collectionId: 'collection-two',
            isCosted: true,
            isPaired: false,
            isQuoted: false,
            isSubmitted: true,
            pricingExpiresAt: new Date('2019-04-20')
          },
          'collection-three': {
            collectionId: 'collection-three',
            isCosted: false,
            isPaired: false,
            isQuoted: false,
            isSubmitted: true,
            pricingExpiresAt: null
          }
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
  t.equal(statusStub.callCount, 1);
});

test('fetchExpiredWithLabels returns a list collections with expired costing', async (t: Test) => {
  const testDate = new Date('2019-04-20');
  const dateExpired = new Date('2019-04-19');
  const dateNotExpired = new Date('2019-04-21');
  const clock = sandbox().useFakeTimers(testDate);

  const findStub = sandbox()
    .stub(CollectionsDAO, 'findSubmittedButUnpaidCollections')
    .resolves([
      { id: 'collection-one' },
      { id: 'collection-two' },
      { id: 'collection-three' },
      { id: 'collection-four' },
      { id: 'collection-five' }
    ]);

  const getDesignsMetaStub = sandbox()
    .stub(StatusService, 'getDesignsMetaByCollection')
    .resolves({
      'collection-one': [
        {
          costInputs: [
            { expiresAt: dateExpired },
            { expiresAt: dateNotExpired }
          ]
        }
      ],
      'collection-two': [
        {
          costInputs: [{ expiresAt: dateExpired }]
        }
      ],
      'collection-three': [
        {
          costInputs: [{ expiresAt: dateNotExpired }]
        }
      ],
      'collection-four': [
        {
          costInputs: [{ expiresAt: dateExpired }, { expiresAt: dateExpired }]
        }
      ],
      'collection-five': [
        {
          costInputs: []
        }
      ]
    });

  const result = await fetchExpiredWithLabels();

  t.deepEqual(
    result,
    [
      { id: 'collection-two', label: 'Expired' },
      { id: 'collection-four', label: 'Expired' }
    ],
    'Returns only collections having designs with expired costing'
  );
  t.equal(findStub.callCount, 1);
  t.equal(getDesignsMetaStub.callCount, 1);
  clock.reset();
});
