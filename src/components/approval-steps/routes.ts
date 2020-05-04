import Knex from 'knex';
import Router from 'koa-router';
import { CommentWithResources } from '@cala/ts-lib/dist/comments/domain-object';
import { omit } from 'lodash';

import * as ApprovalStepsDAO from './dao';
import * as ApprovalStepCommentDAO from '../approval-step-comments/dao';
import * as DesignEventsDAO from '../../dao/design-events';
import db from '../../services/db';
import requireAuth from '../../middleware/require-auth';
import useTransaction from '../../middleware/use-transaction';
import {
  canAccessDesignInQuery,
  canAccessDesignInState,
  canEditDesign,
  requireDesignIdBy
} from '../../middleware/can-access-design';
import addAtMentionDetails from '../../services/add-at-mention-details';
import { addAttachmentLinks } from '../../services/add-attachments-links';
import { DesignEventWithMeta } from '../../domain-objects/design-event';
import ApprovalStep from './domain-object';
import { CalaEvents, emit } from '../../services/pubsub';

type StreamItem = CommentWithResources | DesignEventWithMeta;

const router = new Router();

interface GetApprovalStepsQuery {
  designId: string;
}

function* getApprovalStepsForDesign(
  this: AuthedContext
): Iterator<any, any, any> {
  const { designId }: GetApprovalStepsQuery = this.query;

  const found = yield db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, designId)
  );

  this.body = found;
  this.status = 200;
}

function* getApprovalStepStream(
  this: AuthedContext<{}, { designId: string }>
): Iterator<any, any, any> {
  const comments = yield db.transaction((trx: Knex.Transaction) =>
    ApprovalStepCommentDAO.findByStepId(trx, this.params.stepId)
  );
  if (!comments) {
    this.throw(404);
  }

  const commentsWithResources: CommentWithResources[] = (yield addAtMentionDetails(
    comments
  )).map(addAttachmentLinks);

  const events: DesignEventWithMeta[] = yield db.transaction(
    (trx: Knex.Transaction) =>
      DesignEventsDAO.findApprovalStepEvents(
        trx,
        this.state.designId,
        this.params.stepId
      )
  );

  const streamItems: StreamItem[] = [...commentsWithResources, ...events].sort(
    (a: StreamItem, b: StreamItem) =>
      a.createdAt.getTime() - b.createdAt.getTime()
  );

  this.body = streamItems;
  this.status = 200;
}

const ALLOWED_UPDATE_KEYS = ['state'];

function* updateStep(
  this: TrxContext<AuthedContext<Partial<ApprovalStep>, { designId: string }>>
): Iterator<any, any, any> {
  const { trx } = this.state;
  const { stepId } = this.params;
  const { state } = this.request.body;

  const restKeys = Object.keys(omit(this.request.body, ALLOWED_UPDATE_KEYS));
  if (restKeys.length > 0) {
    this.throw(400, `Keys ${restKeys.join(', ')} are not allowed`);
  }

  const found = yield ApprovalStepsDAO.findById(trx, stepId);
  if (!found) {
    this.throw(404, `Could not find approval step with ID ${stepId}`);
  }

  if (!state) {
    this.throw(400, 'No valid keys to update');
  }

  if (found.state !== state) {
    const step = yield ApprovalStepsDAO.update(trx, stepId, { state });
    yield emit<CalaEvents.RouteUpdatedApprovalStep>(
      'route.updated.approvalStep',
      {
        trx,
        afterUpdate: step,
        beforeUpdate: found,
        actorId: this.state.userId
      }
    );
  }

  this.status = 204;
}

async function getDesignIdFromStep(this: AuthedContext): Promise<string> {
  const { stepId } = this.params;

  const step = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findById(trx, stepId)
  );

  if (!step) {
    this.throw(404, `Step not found with ID: ${stepId}`);
  }

  return step.designId;
}

router.get('/', requireAuth, canAccessDesignInQuery, getApprovalStepsForDesign);
router.get(
  '/:stepId/stream-items',
  requireAuth,
  requireDesignIdBy(getDesignIdFromStep),
  canAccessDesignInState,
  getApprovalStepStream
);
router.patch(
  '/:stepId',
  requireAuth,
  requireDesignIdBy(getDesignIdFromStep),
  canAccessDesignInState,
  canEditDesign,
  useTransaction,
  updateStep
);
export default router.routes();
