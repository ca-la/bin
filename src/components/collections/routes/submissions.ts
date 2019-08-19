import * as Koa from 'koa';
import * as uuid from 'node-uuid';
import CollectionSubmissionStatus from '../../../domain-objects/collection-submission-status';
import CollectionService, {
  isCollectionService
} from '../../../domain-objects/collection-service';
import * as CollectionsDAO from '../dao';
import * as CollectionServicesDAO from '../../../dao/collection-services';
import * as ProductDesignsDAO from '../../product-designs/dao';
import * as DesignEventsDAO from '../../../dao/design-events';
import ProductDesign = require('../../product-designs/domain-objects/product-design');
import * as CreateNotifications from '../../../services/create-notifications';
import attachDefaults from '../../../services/attach-defaults';

export function* createSubmission(
  this: Koa.Application.Context
): AsyncIterableIterator<CollectionSubmissionStatus> {
  const { collectionId } = this.params;
  const { userId } = this.state;
  const { body } = this.request;

  if (isCollectionService(body)) {
    const services: CollectionService = attachDefaults(body, userId);
    const existingServices: CollectionService = yield CollectionServicesDAO.findById(
      services.id
    );

    if (existingServices) {
      yield CollectionServicesDAO.update(existingServices.id, services);
    } else {
      yield CollectionServicesDAO.create(services);
    }

    const designs = yield ProductDesignsDAO.findByCollectionId(collectionId);
    yield Promise.all(
      designs.map((design: ProductDesign) => {
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
      })
    );
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
  const submissionStatus = yield CollectionsDAO.getStatusById(collectionId);

  this.status = 200;
  this.body = submissionStatus;
}
