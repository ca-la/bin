import Knex from 'knex';
import uuid from 'node-uuid';
import ProductDesignsDAO from '../../product-designs/dao';
import * as DesignEventsDAO from '../../../dao/design-events';
import ProductDesign = require('../../product-designs/domain-objects/product-design');
import * as CreateNotifications from '../../../services/create-notifications';
import { determineSubmissionStatus } from '../services/determine-submission-status';
import db from '../../../services/db';

export function* createSubmission(
  this: AuthedContext
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { userId } = this.state;

  const designs: ProductDesign[] = yield ProductDesignsDAO.findByCollectionId(
    collectionId
  );
  yield db.transaction(async (trx: Knex.Transaction) => {
    for (const design of designs) {
      await DesignEventsDAO.create(trx, {
        actorId: userId,
        approvalStepId: null,
        approvalSubmissionId: null,
        bidId: null,
        createdAt: new Date(),
        designId: design.id,
        id: uuid.v4(),
        quoteId: null,
        targetId: null,
        type: 'SUBMIT_DESIGN'
      });
    }
  });
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
