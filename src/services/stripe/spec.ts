import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as RequestService from "./make-request";
import { getBalances, sendTransfer } from ".";
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
  await sendTransfer(data);
  t.deepEqual(makeRequestStub.firstCall.args[0].data, {
    amount: data.amountCents,
    currency: "usd",
    destination: data.destination,
    description: data.description,
    transfer_group: data.bidId,
    source_type: undefined,
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
  await sendTransfer(data);
  t.deepEqual(makeRequestStub.firstCall.args[0].data, {
    amount: data.amountCents,
    currency: "usd",
    destination: data.destination,
    description: data.description,
    transfer_group: data.invoiceId,
    source_type: undefined,
  });

  const idempotencyKey = insecureHash(
    `${data.description}-${data.invoiceId}-${data.destination}`
  );
  t.equal(makeRequestStub.firstCall.args[0].idempotencyKey, idempotencyKey);
});

test("sendTransfer with a sourceType", async (t: Test) => {
  const makeRequestStub = sandbox().stub(RequestService, "default").resolves();
  const data = {
    destination: "my wallet",
    amountCents: 2222,
    description: "here is money.",
    bidId: "a-real-bid-id",
    sourceType: "financing",
    invoiceId: null,
  };

  await sendTransfer(data);
  t.deepEqual(makeRequestStub.firstCall.args[0].data, {
    amount: data.amountCents,
    currency: "usd",
    destination: data.destination,
    description: data.description,
    transfer_group: data.bidId,
    source_type: "financing",
  });
});

test("getBalances", async (t: Test) => {
  sandbox()
    .stub(RequestService, "default")
    .resolves({
      object: "balance",
      available: [
        {
          amount: 3109190,
          currency: "usd",
          source_types: {
            bank_account: 300123,
            card: 200456,
            financing: 100789,
          },
        },
      ],
      connect_reserved: [
        {
          amount: 0,
          currency: "usd",
        },
      ],
      livemode: true,
      pending: [
        {
          amount: -65,
          currency: "usd",
          source_types: {
            bank_account: 0,
            card: -65,
            financing: 0,
          },
        },
      ],
    });

  const balance = await getBalances();

  t.deepEqual(balance, {
    bank_account: 300123,
    card: 200456,
    financing: 100789,
  });
});
