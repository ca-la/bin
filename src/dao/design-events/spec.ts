import * as uuid from 'node-uuid';
import { test, Test } from '../../test-helpers/fresh';
import generateBid from '../../test-helpers/factories/bid';
import createUser = require('../../test-helpers/create-user');

import DesignEvent from '../../domain-objects/design-event';
import { create as createDesign } from '../product-designs';
import {
  create,
  createAll,
  findByDesignId,
  findByTargetId
} from './index';

test('Design Events DAO supports creation', async (t: Test) => {
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const { user: partner } = await createUser();
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const inputEvent: DesignEvent = {
    actorId: cala.id,
    bidId: bid.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };
  const designEvent = await create(inputEvent);

  t.deepEqual(inputEvent, designEvent);
});

test('Design Events DAO supports creating multiple events at once', async (t: Test) => {
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const { user: partner } = await createUser();
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const submitEvent: DesignEvent = {
    actorId: designer.id,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    type: 'SUBMIT_DESIGN'
  };
  const bidEvent: DesignEvent = {
    actorId: cala.id,
    bidId: bid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };
  const acceptBidEvent: DesignEvent = {
    actorId: partner.id,
    bidId: bidEvent.bidId,
    createdAt: new Date(2012, 11, 25),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    type: 'ACCEPT_SERVICE_BID'
  };
  const created = await createAll([bidEvent, submitEvent, acceptBidEvent]);

  t.deepEqual(created, [submitEvent, bidEvent, acceptBidEvent]);
});

test('Design Events DAO supports retrieval by design ID', async (t: Test) => {
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const { user: partner } = await createUser();
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const inputEvent: DesignEvent = {
    actorId: cala.id,
    bidId: bid.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };
  await create(inputEvent);
  const partnerEvents = await findByTargetId(partner.id);
  const designerEvents = await findByTargetId(designer.id);

  t.deepEqual(partnerEvents, [inputEvent]);
  t.deepEqual(designerEvents, []);
});

test('Design Events DAO supports retrieval by target ID', async (t: Test) => {
  const { bid } = await generateBid();
  const { user: designer } = await createUser();
  const { user: cala } = await createUser();
  const { user: partner } = await createUser();
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const submitEvent: DesignEvent = {
    actorId: designer.id,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    type: 'SUBMIT_DESIGN'
  };
  const bidEvent: DesignEvent = {
    actorId: cala.id,
    bidId: bid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };
  const acceptBidEvent: DesignEvent = {
    actorId: partner.id,
    bidId: bidEvent.bidId,
    createdAt: new Date(2012, 11, 25),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: cala.id,
    type: 'ACCEPT_SERVICE_BID'
  };
  await createAll([bidEvent, submitEvent, acceptBidEvent]);
  const designEvents = await findByDesignId(design.id);

  t.deepEqual(designEvents, [
    submitEvent,
    bidEvent,
    acceptBidEvent
  ], 'returns the events in createdAt order');
});
