import Knex from 'knex';
import Router from 'koa-router';
import { CommentWithResources } from '@cala/ts-lib/dist/comments/domain-object';

import * as ApprovalStepsDAO from './dao';
import * as ApprovalStepCommentDAO from '../approval-step-comments/dao';
import * as DesignEventsDAO from '../../dao/design-events';
import db from '../../services/db';
import requireAuth from '../../middleware/require-auth';
import {
  canAccessDesignInQuery,
  canAccessDesignInState,
  requireDesignIdBy
} from '../../middleware/can-access-design';
import addAtMentionDetails from '../../services/add-at-mention-details';
import { addAttachmentLinks } from '../../services/add-attachments-links';
import { DesignEventWithUserMeta } from '../../domain-objects/design-event';

type StreamItem = CommentWithResources | DesignEventWithUserMeta;

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
  this: AuthedContext & { state: { designId: string } }
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

  const events: DesignEventWithUserMeta[] = yield DesignEventsDAO.findApprovalStepEvents(
    this.state.designId,
    this.params.stepId
  );

  const streamItems: StreamItem[] = [...commentsWithResources, ...events].sort(
    (a: StreamItem, b: StreamItem) =>
      a.createdAt.getTime() - b.createdAt.getTime()
  );

  this.body = streamItems;
  this.status = 200;
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
export default router.routes();
