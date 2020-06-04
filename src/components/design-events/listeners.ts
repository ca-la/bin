import DesignEvent, { domain } from "./types";
import { findById } from "./dao";
import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";
import { DaoCreated } from "../../services/pubsub/cala-events";
import { realtimeDesignEventCreated } from "./realtime";
import { sendMessage } from "../iris/send-message";
import { actualizeDesignStepsAfterBidAcceptance } from "../../services/approval-step-state";

export const listeners: Listeners<DesignEvent, typeof domain> = {
  "dao.created": async (
    event: DaoCreated<DesignEvent, typeof domain>
  ): Promise<void> => {
    const { created, trx } = event;

    const withMeta = await findById(trx, created.id);
    if (!withMeta) {
      throw new Error(`Could not find DesignEvent with id ${created.id}`);
    }
    await sendMessage(realtimeDesignEventCreated(withMeta));

    if (created.type === "ACCEPT_SERVICE_BID") {
      await actualizeDesignStepsAfterBidAcceptance(trx, created);
    }
  },
};

export default buildListeners<DesignEvent, typeof domain>(domain, listeners);
