import { sandbox, test, Test } from "../../../../test-helpers/fresh";

import { Task } from "../../types";
import { postProcessQuotePayment } from "./post-process-quote-payment";
import * as SlackUpdateService from "./send-slack-update";

const task: Task<"POST_PROCESS_QUOTE_PAYMENT"> = {
  deduplicationId: "an-invoice-id",
  type: "POST_PROCESS_QUOTE_PAYMENT",
  keys: {
    invoiceId: "an-invoice-id",
    userId: "a-user-id",
    collectionId: "a-collection-id",
    paymentAmountCents: 15_000,
  },
};

test("postProcessQuotePayment", async (t: Test) => {
  const slackUpdateStub = sandbox().stub(SlackUpdateService, "sendSlackUpdate");

  const result = await postProcessQuotePayment(task);

  t.deepEqual(
    result,
    {
      type: "SUCCESS",
      message: null,
    },
    "post process success"
  );

  t.deepEqual(
    slackUpdateStub.args,
    [
      [
        {
          invoiceId: "an-invoice-id",
          userId: "a-user-id",
          collectionId: "a-collection-id",
          paymentAmountCents: 15_000,
        },
      ],
    ],
    "slack update service has been called with correct arguments"
  );
});
