import { sandbox } from '../fresh';
import Sinon from 'sinon';
import * as FetchService from '../../components/collections/services/fetch-with-labels';
import Collection from '../../components/collections/domain-object';

export const stubFetchUncostedWithLabels = (): {
  collections: Collection[];
  stub: Sinon.SinonStub;
} => {
  const collections = [
    {
      createdAt: new Date('2019-02-04T23:06:17.537Z'),
      createdBy: '66ac689b-34a6-4fd4-b3c8-b2ffb2c77c66',
      deletedAt: null,
      description: '',
      id: '48b54194-257f-42a3-a6a2-31e91862a463',
      title: 'unsubmitted test collection',
      label: 'Needs Costing'
    },
    {
      createdAt: new Date('2019-02-05T19:59:45.239Z'),
      createdBy: '66ac689b-34a6-4fd4-b3c8-b2ffb2c77c66',
      deletedAt: null,
      description: '',
      id: '4e92fdf8-fc6c-4d33-96f6-ba325d9ab5e8',
      title: 'jhadfkjhas',
      label: 'Needs Costing'
    }
  ];

  const stub = sandbox()
    .stub(FetchService, 'fetchUncostedWithLabels')
    .resolves(collections);

  return {
    collections,
    stub
  };
};
