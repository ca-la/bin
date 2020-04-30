import * as Knex from 'knex';
import ApprovalStep, {
  ApprovalStepState
} from '../../components/approval-steps/domain-object';

export type CalaEventType =
  | 'bid.accepted'
  | 'bid.created'
  | 'approvalStep.stateChanged';

interface CalaEventBase {
  trx: Knex.Transaction;
  type: CalaEventType;
}

export interface BidAccepted extends CalaEventBase {
  type: 'bid.accepted';
  bidId: string;
  designId: string;
}
export interface BidCreated extends CalaEventBase {
  type: 'bid.created';
  bidId: string;
}

export interface ApprovalStepStateChanged extends CalaEventBase {
  type: 'approvalStep.stateChanged';
  approvalStep: ApprovalStep;
  oldState: ApprovalStepState;
}

export type Event = BidAccepted | BidCreated | ApprovalStepStateChanged;

export type Handler<T extends Event> = (event: T) => Promise<any>;
