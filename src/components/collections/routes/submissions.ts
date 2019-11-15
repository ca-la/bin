import uuid from 'node-uuid';
import ProductDesignsDAO from '../../product-designs/dao';
import * as DesignEventsDAO from '../../../dao/design-events';
import ProductDesign = require('../../product-designs/domain-objects/product-design');
import * as CreateNotifications from '../../../services/create-notifications';
import { determineSubmissionStatus } from '../services/determine-submission-status';

export function* createSubmission(
  this: AuthedContext
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { userId } = this.state;

  const designs: ProductDesign[] = yield ProductDesignsDAO.findByCollectionId(
    collectionId
  );
  for (const design of designs) {
    yield DesignEventsDAO.create({
      actorId: userId,
      bidId: null,
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: null,
      type: 'SUBMIT_DESIGN'
    });
  }
  CreateNotifications.sendDesignerSubmitCollection(collectionId, userId);
  const submissionStatusByCollection = yield determineSubmissionStatus([
    collectionId
  ]);
  this.status = 201;
  this.body = submissionStatusByCollection[collectionId];
}

export function* getSubmissionStatus(
  this: AuthedContext
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const submissionStatusByCollection = yield determineSubmissionStatus([
    collectionId
  ]);

  this.status = 200;
  this.body = submissionStatusByCollection[collectionId];
}
