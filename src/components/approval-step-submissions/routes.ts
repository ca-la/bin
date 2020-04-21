import Knex from 'knex';
import Router from 'koa-router';

import * as ApprovalSubmissionsDAO from './dao';
import * as ApprovalStepsDAO from '../approval-steps/dao';
import db from '../../services/db';
import requireAuth from '../../middleware/require-auth';
import { requireQueryParam } from '../../middleware/require-query-param';
import {
  canAccessDesignInState,
  requireDesignIdBy
} from '../../middleware/can-access-design';
import ApprovalStepSubmission from './domain-object';

const router = new Router();

interface GetApprovalSubmissionsQuery {
  stepId: string;
}

export function* getApprovalSubmissionsForStep(
  this: AuthedContext<{}, PermittedState>
): Iterator<any, any, any> {
  const { stepId }: GetApprovalSubmissionsQuery = this.query;

  if (!this.state.permissions.canView) {
    this.throw(403, `Cannot view design for step ${stepId}`);
  }

  const found = yield db.transaction(async (trx: Knex.Transaction) => {
    return ApprovalSubmissionsDAO.findByStep(trx, stepId);
  });

  this.body = found;
  this.status = 200;
}

export function* createApprovalSubmission(
  this: AuthedContext
): Iterator<any, any, any> {
  const { stepId }: GetApprovalSubmissionsQuery = this.query;

  const [approvalSubmission] = yield db.transaction(
    async (trx: Knex.Transaction) => {
      return ApprovalSubmissionsDAO.createAll(trx, [
        {
          ...((this.request.body as unknown) as ApprovalStepSubmission),
          stepId
        }
      ]);
    }
  );
  this.body = approvalSubmission;
  this.status = 200;
}

async function getDesignIdFromStep(this: AuthedContext): Promise<string> {
  const { stepId }: GetApprovalSubmissionsQuery = this.query;

  const step = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findById(trx, stepId)
  );

  if (!step) {
    this.throw(404, `Step not found with ID: ${stepId}`);
  }

  return step.designId;
}

router.get(
  '/',
  requireAuth,
  requireQueryParam<GetApprovalSubmissionsQuery>('stepId'),
  requireDesignIdBy(getDesignIdFromStep),
  canAccessDesignInState,
  getApprovalSubmissionsForStep
);

router.post(
  '/',
  requireAuth,
  requireQueryParam<GetApprovalSubmissionsQuery>('stepId'),
  requireDesignIdBy(getDesignIdFromStep),
  canAccessDesignInState,
  createApprovalSubmission
);

export default router.routes();
