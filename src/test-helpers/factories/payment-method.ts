import Knex from "knex";
import uuid from "node-uuid";
import CustomersDAO from "../../components/customers/dao";
import PaymentMethodsDAO from "../../components/payment-methods/dao";

export async function generatePaymentMethod(
  trx: Knex.Transaction,
  options: {
    userId: string | null;
    teamId: string | null;
  }
) {
  const { userId, teamId } = options;

  const customer = await CustomersDAO.create(trx, {
    id: uuid.v4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    provider: "STRIPE",
    customerId: "stripe-customer-id",
    userId,
    teamId,
  } as any);
  const paymentMethod = await PaymentMethodsDAO.create(trx, {
    id: uuid.v4(),
    stripeCustomerId: "customer1",
    stripeSourceId: "source1",
    lastFourDigits: "1234",
    createdAt: new Date(),
    deletedAt: null,
    customerId: customer.id,
  });

  return { customer, paymentMethod };
}
