import * as Koa from 'koa';
import * as uuid from 'node-uuid';
import CollectionSubmissionStatus from '../../domain-objects/collection-submission-status';
import { isCollectionService } from '../../domain-objects/collection-service';
import * as CollectionsDAO from '../../dao/collections';
import * as CollectionServicesDAO from '../../dao/collection-services';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as DesignEventsDAO from '../../dao/design-events';
import ProductDesign = require('../../domain-objects/product-design');
import * as CreateNotifications from '../../services/create-notifications';
import attachDefaults from '../../services/attach-defaults';

export function* createSubmission(
  this: Koa.Application.Context
): AsyncIterableIterator<CollectionSubmissionStatus> {
  const { collectionId } = this.params;
  const { role, userId } = this.state;
  const { body } = this.request;
  const isAdmin = role === 'ADMIN';

  const collection = yield CollectionsDAO.findById(collectionId);

  // TODO: Get submission permissions figured out
  if (!isAdmin && collection.createdBy !== userId) {
    this.throw(403, 'Only the collection owner can submit a collection');
    return;
  }

  if (isCollectionService(body)) {
    yield CollectionServicesDAO.create(attachDefaults(body, userId));
    const designs = yield ProductDesignsDAO.findByCollectionId(collectionId);
    yield Promise.all(designs.map((design: ProductDesign) => {
      return DesignEventsDAO.create({
        actorId: userId,
        bidId: null,
        createdAt: new Date(),
        designId: design.id,
        id: uuid.v4(),
        quoteId: null,
        targetId: null,
        type: 'SUBMIT_DESIGN'
      });
    }));
    CreateNotifications.sendDesignerSubmitCollection(collectionId, userId);
    const submissionStatus = yield CollectionsDAO.getStatusById(collectionId);
    this.status = 201;
    this.body = submissionStatus;
  } else {
    this.throw(400, 'Request does not match collection service');
  }
}

export function* getSubmissionStatus(
  this: Koa.Application.Context
): AsyncIterableIterator<CollectionSubmissionStatus> {
  const { collectionId } = this.params;
  const { role, userId } = this.state;
  const isAdmin = role === 'ADMIN';

  const collection = yield CollectionsDAO.findById(collectionId);

  // TODO: Get submission permissions figured out
  if (!isAdmin && collection.createdBy !== userId) {
    this.throw(403, 'Only the collection owner can submit a collection');
    return;
  }

  const submissionStatus = yield CollectionsDAO.getStatusById(collectionId);

  this.status = 200;
  this.body = submissionStatus;
}
