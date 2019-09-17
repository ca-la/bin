import { Machine, StateMachine } from 'xstate';
import DesignEvent, {
  DesignEventTypes
} from '../../../../domain-objects/design-event';
import { ProductDesignDataWithMeta } from '../../domain-objects/with-meta';
import { BasePricingCostInput } from '../../../pricing-cost-inputs/domain-object';

export enum DesignState {
  INITIAL = 'INITIAL',
  SUBMITTED = 'SUBMITTED',
  COSTED = 'COSTED',
  CHECKED_OUT = 'CHECKED_OUT',
  PAIRED = 'PAIRED'
}

interface DesignMachineStateSchema {
  states: {
    [DesignState.INITIAL]: {};
    [DesignState.SUBMITTED]: {};
    [DesignState.COSTED]: {};
    [DesignState.CHECKED_OUT]: {};
    [DesignState.PAIRED]: {};
  };
}

type DesignMachineEvent =
  | { type: DesignEventTypes }
  | { type: 'EXPIRE_COST_INPUT' };

interface DesignMachineContext {}

function createDesignMachine(
  designId: string
): StateMachine<
  DesignMachineContext,
  DesignMachineStateSchema,
  DesignMachineEvent
> {
  return Machine<
    DesignMachineContext,
    DesignMachineStateSchema,
    DesignMachineEvent
  >({
    id: `design-machine-${designId}`,
    initial: DesignState.INITIAL,
    states: {
      [DesignState.INITIAL]: {
        on: {
          SUBMIT_DESIGN: DesignState.SUBMITTED,
          COMMIT_COST_INPUTS: DesignState.COSTED
        }
      },
      [DesignState.SUBMITTED]: {
        on: {
          COMMIT_COST_INPUTS: DesignState.COSTED
        }
      },
      [DesignState.COSTED]: {
        on: {
          COMMIT_QUOTE: DesignState.CHECKED_OUT,
          EXPIRE_COST_INPUT: DesignState.INITIAL
        }
      },
      [DesignState.CHECKED_OUT]: {
        on: {
          COMMIT_PARTNER_PAIRING: DesignState.PAIRED
        }
      },
      [DesignState.PAIRED]: {
        type: 'final'
      }
    }
  });
}

function hasActiveCostInputs(costInputs: BasePricingCostInput[]): boolean {
  const now = new Date();
  return costInputs.some(
    (costInput: BasePricingCostInput): boolean => {
      return (
        costInput.expiresAt === null || new Date(costInput.expiresAt) > now
      );
    }
  );
}

/**
 * Determines the state the design is in based off the associated events and cost information.
 */
export function determineState(design: ProductDesignDataWithMeta): DesignState {
  const { costInputs, events } = design;
  const hasCommitted = events.some(
    (event: DesignEvent): boolean => event.type === 'COMMIT_QUOTE'
  );
  const hasActiveCosts = hasActiveCostInputs(costInputs);

  const machine = createDesignMachine(design.id);
  let state = machine.initialState;

  for (const event of events) {
    state = machine.transition(state, event.type);

    if (
      state.value === DesignState.COSTED &&
      !hasActiveCosts &&
      !hasCommitted
    ) {
      state = machine.transition(state, { type: 'EXPIRE_COST_INPUT' });
    }
  }

  return state.value as DesignState;
}
