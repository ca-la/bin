import Knex from 'knex';
import Router from 'koa-router';

import requireAuth from '../../middleware/require-auth';
import { findByApprovalStepId } from '../../dao/task-events';
import { IOTask, taskEventFromIO } from '../../domain-objects/task-event';
import createTask from '../../services/create-task';
import { requireQueryParam } from '../../middleware/require-query-param';
import {
  canAccessDesignInState,
  canEditDesign,
  requireDesignIdBy
} from '../../middleware/can-access-design';
import * as approvalStepDAO from '../approval-steps/dao';
import db from '../../services/db';

const router = new Router();

interface ApprovalStepTaskQuery {
  approvalStepId: string;
}

function* createApprovalStepTask(
  this: AuthedContext<IOTask>
): Iterator<any, any, any> {
  const { approvalStepId } = this.request.body;
  if (!approvalStepId) {
    this.throw(400, 'approvalStepId is missing');
  }

  const taskId = this.request.body.id;
  const taskEvent = taskEventFromIO(this.request.body, this.state.userId);

  const created = yield createTask(
    taskId,
    taskEvent,
    undefined,
    approvalStepId
  );

  this.body = created;
  this.status = 201;
}

function* getApprovalStepTasks(this: AuthedContext): Iterator<any, any, any> {
  const { approvalStepId } = this.query;
  const tasks = yield findByApprovalStepId(approvalStepId);
  if (!tasks) {
    this.throw(404);
  }
  this.status = 200;
  this.body = tasks;
}

const fetchDesignByApprovalStepTask = (
  getApprovalStepId: (ctx: AuthedContext<IOTask>) => string
): ((this: AuthedContext<any>) => Promise<string>) =>
  async function(this: AuthedContext<IOTask>): Promise<string> {
    const approvalStepId = getApprovalStepId(this);
    if (!approvalStepId) {
      this.throw(400, 'approvalStepId is missing');
    }
    const approvalStep = await db.transaction((trx: Knex.Transaction) =>
      approvalStepDAO.findById(trx, approvalStepId)
    );
    return approvalStep.designId;
  };

router.get(
  '/',
  requireAuth,
  requireQueryParam<ApprovalStepTaskQuery>('approvalStepId'),
  requireDesignIdBy<IOTask>(
    fetchDesignByApprovalStepTask(
      (ctx: AuthedContext<IOTask>): string => ctx.query.approvalStepId
    )
  ),
  canAccessDesignInState,
  getApprovalStepTasks
);
router.post(
  '/',
  requireAuth,
  requireDesignIdBy<IOTask>(
    fetchDesignByApprovalStepTask(
      (ctx: AuthedContext<IOTask>): string => {
        if (!ctx.request.body.approvalStepId) {
          ctx.throw(400, 'Missing approvalStepId');
        }
        return ctx.request.body.approvalStepId || '';
      }
    )
  ),
  canAccessDesignInState,
  canEditDesign,
  createApprovalStepTask
);

export default router.routes();
