import * as Knex from 'knex';
import ApprovalStep from '../../components/approval-steps/domain-object';

export type CalaEventType =
  | 'dao.accepted.bid'
  | 'dao.updated.approvalStep.state'
  | 'route.updated.approvalStep'
  | 'route.updated.approvalStep.collaboratorId';

interface CalaEventBase {
  trx: Knex.Transaction;
  type: CalaEventType;
}

export interface DaoAcceptedBid extends CalaEventBase {
  type: 'dao.accepted.bid';
  bidId: string;
  designId: string;
}

export interface RouteUpdatedApprovalStep extends CalaEventBase {
  type: 'route.updated.approvalStep';
  before: ApprovalStep;
  updated: ApprovalStep;
  actorId: string;
}

export interface DaoUpdatedApprovalStepState extends CalaEventBase {
  type: 'dao.updated.approvalStep.state';
  before: ApprovalStep;
  updated: ApprovalStep;
}
export interface RouteUpdatedApprovalStepCollaboratorId extends CalaEventBase {
  type: 'route.updated.approvalStep.collaboratorId';
  actorId: string;
  before: ApprovalStep;
  updated: ApprovalStep;
}

export type Event =
  | DaoAcceptedBid
  | DaoUpdatedApprovalStepState
  | RouteUpdatedApprovalStep
  | RouteUpdatedApprovalStepCollaboratorId;

export type Handler<T extends Event> = (event: T) => Promise<any>;
