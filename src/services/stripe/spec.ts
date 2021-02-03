import Knex from "knex";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import PaymentMethodsDAO from "../../components/payment-methods/dao";
import * as UsersDAO from "../../components/users/dao";
import insecureHash from "../insecure-hash";

import * as RequestService from "./make-request";
import { findOrCreateCustomerId, getBalances, sendTransfer } from ".";

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

test("findOrCreateCustomerId: no existing customer", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(PaymentMethodsDAO, "findByUserId").resolves([]);
  sandbox()
    .stub(UsersDAO, "findById")
    .resolves({ email: "example@example.com", name: "Exemplar" });
  const requestStub = sandbox().stub(RequestService, "default");

  requestStub.onFirstCall().resolves([]); // GET /customers email=example@example.com
  requestStub.onSecondCall().resolves({ id: "a-stripe-customer-id" }); // POST /customers

  const customerId = await findOrCreateCustomerId("a-user-id", trx);

  t.equal(customerId, "a-stripe-customer-id", "returns Stripe response ID");

  t.deepEqual(
    requestStub.args,
    [
      [
        {
          method: "get",
          path: "/customers",
          data: { email: "example@example.com", limit: 1 },
        },
      ],
      [
        {
          method: "post",
          path: "/customers",
          data: { email: "example@example.com", description: "Exemplar" },
        },
      ],
    ],
    "makes the correct calls to Stripe"
  );
});

test("findOrCreateCustomerId: stripe customer no PaymentMethod", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(PaymentMethodsDAO, "findByUserId").resolves([]);
  sandbox()
    .stub(UsersDAO, "findById")
    .resolves({ email: "example@example.com", name: "Exemplar" });
  const requestStub = sandbox().stub(RequestService, "default");

  requestStub.onFirstCall().resolves([{ id: "a-stripe-customer-id" }]); // GET /customers email=example@example.com

  const customerId = await findOrCreateCustomerId("a-user-id", trx);

  t.equal(customerId, "a-stripe-customer-id", "returns Stripe response ID");

  t.deepEqual(
    requestStub.args,
    [
      [
        {
          method: "get",
          path: "/customers",
          data: { email: "example@example.com", limit: 1 },
        },
      ],
    ],
    "makes the correct calls to Stripe"
  );
});

test("findOrCreateCustomerId: stripe customer with PaymentMethod", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox()
    .stub(PaymentMethodsDAO, "findByUserId")
    .resolves([{ stripeCustomerId: "a-stripe-customer-id" }]);
  sandbox()
    .stub(UsersDAO, "findById")
    .resolves({ email: "example@example.com", name: "Exemplar" });
  const requestStub = sandbox().stub(RequestService, "default");

  const customerId = await findOrCreateCustomerId("a-user-id", trx);

  t.equal(customerId, "a-stripe-customer-id", "returns Stripe response ID");

  t.deepEqual(requestStub.args, [], "doesn't lookup user from Stripe");
});
