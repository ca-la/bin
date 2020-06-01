import { DesignEventWithMeta, domain } from "./types";
import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";
import { DaoCreated } from "../../services/pubsub/cala-events";
import { actualizeDesignStepsAfterBidAcceptance } from "../../services/approval-step-state";

export const listeners: Listeners<DesignEventWithMeta, typeof domain> = {
  "dao.created": async (
    event: DaoCreated<DesignEventWithMeta, typeof domain>
  ): Promise<void> => {
    const { created, trx } = event;

    if (created.type === "ACCEPT_SERVICE_BID") {
      await actualizeDesignStepsAfterBidAcceptance(trx, created);
    }
  },
};

export default buildListeners<DesignEventWithMeta, typeof domain>(
  domain,
  listeners
);
