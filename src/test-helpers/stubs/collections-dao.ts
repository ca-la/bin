import { sandbox } from '../../test-helpers/fresh';
import * as Sinon from 'sinon';
import * as CollectionsDAO from '../../dao/collections';
import Collection from '../../domain-objects/collection';

export const stubFindWithUncostedDesigns = (): {
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
      title: 'unsubmitted test collection'
    },
    {
      createdAt: new Date('2019-02-05T19:59:45.239Z'),
      createdBy: '66ac689b-34a6-4fd4-b3c8-b2ffb2c77c66',
      deletedAt: null,
      description: '',
      id: '4e92fdf8-fc6c-4d33-96f6-ba325d9ab5e8',
      title: 'jhadfkjhas'
    }
  ];

  const stub = sandbox()
    .stub(CollectionsDAO, 'findWithUncostedDesigns')
    .resolves(collections);

  return {
    collections,
    stub
  };
};
