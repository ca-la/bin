import { Machine, StateMachine } from 'xstate';
import Bid from '../../domain-object';
import DesignEvent, { DesignEventTypes } from '../../../../domain-objects/design-event';
import { isExpired } from '../is-expired';

export enum BidState {
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  INITIAL = 'INITIAL',
  OPEN = 'OPEN',
  REJECTED = 'REJECTED',
  REMOVED = 'REMOVED'
}

interface BidMachineStateSchema {
  states: {
    [BidState.INITIAL]: {};
    [BidState.OPEN]: {};
    [BidState.ACCEPTED]: {};
    [BidState.REJECTED]: {};
    [BidState.EXPIRED]: {};
    [BidState.REMOVED]: {};
  };
}

type BidMachineEvent =
  | { type: DesignEventTypes }
  | { type: 'EXPIRE_BID' };

interface BidMachineContext {}

function createBidMachine(
  bidId: string
): StateMachine<BidMachineContext, BidMachineStateSchema, BidMachineEvent> {
  return Machine<BidMachineContext, BidMachineStateSchema, BidMachineEvent>({
    id: `bid-machine-${bidId}`,
    initial: BidState.INITIAL,
    states: {
      [BidState.INITIAL]: {
        on: {
          BID_DESIGN: BidState.OPEN,
          EXPIRE_BID: BidState.EXPIRED
        }
      },
      [BidState.OPEN]: {
        on: {
          ACCEPT_SERVICE_BID: BidState.ACCEPTED,
          EXPIRE_BID: BidState.EXPIRED,
          REJECT_SERVICE_BID: BidState.REJECTED,
          REMOVE_PARTNER: BidState.REMOVED
        }
      },
      [BidState.ACCEPTED]: {
        on: {
          REMOVE_PARTNER: 'REMOVED'
        }
      },
      [BidState.EXPIRED]: {
        type: 'final'
      },
      [BidState.REMOVED]: {
        type: 'final'
      },
      [BidState.REJECTED]: {
        type: 'final'
      }
    }
  });
}

export function determineStateFromEvents(bid: Bid, events: DesignEvent[]): BidState {
  const machine = createBidMachine(bid.id);
  let state = machine.initialState;

  for (const event of events) {
    state = machine.transition(state, event.type);
  }

  if (isExpired(bid)) {
    state = machine.transition(state, 'EXPIRE_BID');
  }

  return state.value as BidState;
}
