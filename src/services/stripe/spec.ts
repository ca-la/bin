import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as RequestService from "./make-request";
import { sendTransfer } from ".";
import insecureHash from "../insecure-hash";

test("sendTransfer with a Bid Id", async (t: Test) => {
  const makeRequestStub = sandbox().stub(RequestService, "default").resolves();
  const data = {
    destination: "my wallet",
    amountCents: 2222,
    description: "here is money.",
    bidId: "a-real-bid-id",
    invoiceId: null,
  };
  sendTransfer(data);
  t.deepEqual(makeRequestStub.firstCall.args[0].data, {
    amount: data.amountCents,
    currency: "usd",
    destination: data.destination,
    description: data.description,
    transfer_group: data.bidId,
  });

  const idempotencyKey = insecureHash(
    `${data.description}-${data.bidId}-${data.destination}`
  );
  t.equal(makeRequestStub.firstCall.args[0].idempotencyKey, idempotencyKey);
});

test("sendTransfer with a invoice Id", async (t: Test) => {
  const makeRequestStub = sandbox().stub(RequestService, "default").resolves();
  const data = {
    destination: "my wallet",
    amountCents: 2222,
    description: "here is money.",
    bidId: null,
    invoiceId: "a-real-invoice-id",
  };
  sendTransfer(data);
  t.deepEqual(makeRequestStub.firstCall.args[0].data, {
    amount: data.amountCents,
    currency: "usd",
    destination: data.destination,
    description: data.description,
    transfer_group: data.invoiceId,
  });

  const idempotencyKey = insecureHash(
    `${data.description}-${data.invoiceId}-${data.destination}`
  );
  t.equal(makeRequestStub.firstCall.args[0].idempotencyKey, idempotencyKey);
});
