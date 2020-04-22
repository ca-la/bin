import Knex from 'knex';
import Router from 'koa-router';

import uuid from 'node-uuid';
import * as ApprovalSubmissionsDAO from './dao';
import * as ApprovalStepsDAO from '../approval-steps/dao';
import * as CollaboratorsDAO from '../collaborators/dao';
import * as DesignEventsDAO from '../../dao/design-events';
import db from '../../services/db';
import requireAuth from '../../middleware/require-auth';
import { requireQueryParam } from '../../middleware/require-query-param';
import {
  canAccessDesignInState,
  requireDesignIdBy
} from '../../middleware/can-access-design';
import ApprovalStepSubmission, {
  ApprovalStepSubmissionState
} from './domain-object';
import { omit } from 'lodash';
import * as NotificationsService from '../../services/create-notifications';

const router = new Router();

interface GetApprovalSubmissionsQuery {
  stepId: string;
}

interface SubmissionState {
  submission: ApprovalStepSubmission;
}
interface DesignIdState {
  designId: string;
}
type SubmissionStateContext = AuthedContext<{}, SubmissionState>;

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

const ALLOWED_UPDATE_KEYS = ['collaboratorId'];

export function* updateApprovalSubmission(
  this: AuthedContext<
    { collaboratorId: string },
    PermittedState & SubmissionState & DesignIdState
  >
): Iterator<any, any, any> {
  const { submission, userId } = this.state;
  if (!this.state.permissions.canView) {
    this.throw(403, `Cannot view design for step ${submission.stepId}`);
  }

  const restKeys = omit(this.request.body, ALLOWED_UPDATE_KEYS);
  if (Object.keys(restKeys).length > 0) {
    this.throw(400, `Keys ${Object.keys(restKeys).join(', ')} are not allowed`);
  }

  if (this.request.body.hasOwnProperty('collaboratorId')) {
    if (submission.state === ApprovalStepSubmissionState.APPROVED) {
      this.throw(
        400,
        'Changing assignee is not allowed after submission has been approved'
      );
    }
    if (submission.collaboratorId === this.request.body.collaboratorId) {
      this.body = submission;
      this.status = 200;
      return;
    }
    yield db.transaction(async (trx: Knex.Transaction) => {
      const collaborator = this.request.body.collaboratorId
        ? await CollaboratorsDAO.findById(this.request.body.collaboratorId)
        : null;
      const updatedSubmission = await ApprovalSubmissionsDAO.setAssignee(
        trx,
        submission.id,
        this.request.body.collaboratorId
      );
      await DesignEventsDAO.create(
        {
          actorId: userId,
          approvalStepId: this.state.submission.stepId,
          bidId: null,
          createdAt: new Date(),
          designId: this.state.designId,
          id: uuid.v4(),
          quoteId: null,
          targetId: collaborator && collaborator.userId,
          type: 'STEP_ASSIGNMENT'
        },
        trx
      );
      if (collaborator) {
        await NotificationsService.sendApprovalSubmissionAssignmentNotification(
          trx,
          userId,
          updatedSubmission,
          collaborator
        );
      }
      this.body = updatedSubmission;
    });
  } else {
    // todo: put state change logic here
    this.throw('Not implemented');
  }
}

type StringGetter<State> = (this: AuthedContext<{}, State>) => string;
type AsyncStringGetter<State> = (
  this: AuthedContext<{}, State>
) => Promise<string>;

function getDesignIdFromStep<State = {}>(
  getStep: StringGetter<State>
): AsyncStringGetter<State> {
  return async function(this: AuthedContext<{}, State>): Promise<string> {
    const stepId = getStep.apply(this);
    const step = await db.transaction((trx: Knex.Transaction) =>
      ApprovalStepsDAO.findById(trx, stepId)
    );

    if (!step) {
      this.throw(404, `Step not found with ID: ${stepId}`);
    }

    return step.designId;
  };
}

function* injectSubmission(
  this: SubmissionStateContext,
  next: () => Promise<any>
): Generator<any, any, any> {
  const { submissionId } = this.params;

  const submission = yield db.transaction((trx: Knex.Transaction) =>
    ApprovalSubmissionsDAO.findById(trx, submissionId)
  );
  if (!submission) {
    this.throw(404, `Submission not found with ID: ${submissionId}`);
  }

  this.state.submission = submission;

  yield next;
}

router.get(
  '/',
  requireAuth,
  requireQueryParam<GetApprovalSubmissionsQuery>('stepId'),
  requireDesignIdBy(
    getDesignIdFromStep(function(this: AuthedContext): string {
      return this.query.stepId;
    })
  ),
  canAccessDesignInState,
  getApprovalSubmissionsForStep
);

router.patch(
  '/:submissionId',
  requireAuth,
  injectSubmission,
  requireDesignIdBy<{}, SubmissionState>(
    getDesignIdFromStep<SubmissionState>(function(
      this: SubmissionStateContext
    ): string {
      return this.state.submission.stepId;
    })
  ),
  canAccessDesignInState,
  updateApprovalSubmission
);

router.post(
  '/',
  requireAuth,
  requireQueryParam<GetApprovalSubmissionsQuery>('stepId'),
  requireDesignIdBy(
    getDesignIdFromStep(function(this: AuthedContext): string {
      return this.query.stepId;
    })
  ),
  canAccessDesignInState,
  createApprovalSubmission
);

export default router.routes();
