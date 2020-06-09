import process from "process";
import meow from "meow";

import { log, logServerError } from "../../services/logger";
import { format, green, yellow } from "../../services/colors";
import db from "../../services/db";
import { actualizeDesignStepsAfterBidAcceptance } from "../../services/approval-step-state";
import DesignEventsDAO from "../../components/design-events/dao";

const HELP_TEXT = `
Unblocks steps if they have been paired with a partner

Usage
$ bin/run [environment] src/scripts/one-off/2020-06-03-unblock-paired-designs.ts [--dry-run]
`;

const cli = meow(HELP_TEXT, {
  flags: {
    dryRun: {
      default: false,
      type: "boolean",
    },
  },
});

async function main(): Promise<string> {
  const isDryRun = cli.flags.dryRun;
  const trx = await db.transaction();

  const pairingEventsBefore = await DesignEventsDAO.find(trx, {
    type: "STEP_PARTNER_PAIRING",
  });

  const bidAcceptanceEvents = await DesignEventsDAO.find(trx, {
    type: "ACCEPT_SERVICE_BID",
  });

  for (let i = 0; i < bidAcceptanceEvents.length; i = i + 1) {
    const event = bidAcceptanceEvents[i];
    log(`[${i + 1}/${bidAcceptanceEvents.length}] Design ${event.designId}`);
    await actualizeDesignStepsAfterBidAcceptance(trx, event);
  }

  const pairingEventsAfter = await DesignEventsDAO.find(trx, {
    type: "STEP_PARTNER_PAIRING",
  });
  log(
    format(
      green,
      `Paired ${pairingEventsAfter.length - pairingEventsBefore.length} steps`
    )
  );

  if (isDryRun) {
    trx.rollback();
    return format(yellow, "Transaction rolled back.");
  }

  trx.commit();
  return format(green, "Success!");
}

main()
  .catch((err: any) => {
    logServerError(err);
    process.exit(1);
  })
  .then((message: string) => {
    log(message);
    process.exit(0);
  });
