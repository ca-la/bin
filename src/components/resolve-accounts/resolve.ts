import { ResolveAccountData } from '@cala/ts-lib/dist/resolve';

import * as InvoicesDAO from '../../dao/invoices';
import ResolveAccount, {
  isRawResolveData,
  RawResolveData
} from './domain-object';
import { RESOLVE_API_URL } from '../../config';
import toDateOrNull from '../../services/to-date';
import { fetch } from '../../services/fetch';
import Invoice = require('../../domain-objects/invoice');

export async function hasResolveAccount(
  resolveCustomerId: string
): Promise<boolean> {
  const url = `${RESOLVE_API_URL}/customers/${resolveCustomerId}`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, { headers });
  if (response.status >= 500) {
    throw new Error(
      `GET request to resolve failed: ${response.status}: ${
        response.statusText
      }`
    );
  }
  if (response.status < 200 || response.status >= 400) {
    return false;
  }
  const data = await response.json();
  if (data && isRawResolveData(data)) {
    return true;
  }
  return false;
}

export async function getResolveAccountData(
  account: ResolveAccount
): Promise<ResolveAccountData> {
  const { resolveCustomerId } = account;
  const url = `${RESOLVE_API_URL}/customers/${resolveCustomerId}`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, { headers });
  if (response.status < 200 || response.status >= 400) {
    throw new Error(
      `GET request to resolve failed: ${response.status}: ${
        response.statusText
      }`
    );
  }
  const data = await response.json();
  const unpaidPayLaterInvoiceAmounts: Invoice[] = await InvoicesDAO.findByUserAndUnpaid(
    account.userId
  );

  const totalUntrackedAmountCents = unpaidPayLaterInvoiceAmounts.reduce(
    (acc: number, res: Invoice) => acc + res.totalCents,
    0
  );

  if (data && isRawResolveData(data)) {
    return encodeRawResolveData(data, account, totalUntrackedAmountCents);
  }
  throw new Error(
    `Could not retrieve Resolve data for customer id ${resolveCustomerId}`
  );
}

export async function getAllResolveAccountData(
  accounts: ResolveAccount[]
): Promise<ResolveAccountData[]> {
  const withNulls = await Promise.all(
    accounts.map(
      async (account: ResolveAccount) => await getResolveAccountData(account)
    )
  );
  return withNulls.filter(
    (account: ResolveAccountData | null): account is ResolveAccountData =>
      account !== null
  );
}

export function encodeRawResolveData(
  rawData: RawResolveData,
  account: ResolveAccount,
  untrackedAmountCents: number
): ResolveAccountData {
  return {
    approvedAt: toDateOrNull(rawData.approved_at),
    availableAmountCents: rawData.amount_available * 100 - untrackedAmountCents,
    balanceAmountCents: rawData.amount_balance * 100 + untrackedAmountCents,
    businessName: rawData.business_name,
    customerId: account.resolveCustomerId,
    id: account.id,
    isApproved: rawData.approved,
    totalAmountCents: rawData.amount_approved * 100
  };
}
