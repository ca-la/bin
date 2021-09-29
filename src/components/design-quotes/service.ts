import Knex from "knex";
import { sum } from "lodash";

import * as PlansDAO from "../plans/dao";
import {
  CartDetails,
  DesignQuote,
  DesignQuoteLineItem,
  FinancingItem,
} from "./types";
import {
  UnsavedQuote,
  CreateQuotePayload,
  createUnsavedQuote,
} from "../../services/generate-pricing-quote";
import * as PricingCostInputsDAO from "../pricing-cost-inputs/dao";
import TeamsDAO from "../teams/dao";
import { PricingCostInput } from "../pricing-cost-inputs/types";
import db from "../../services/db";
import { CreditsDAO } from "../credits";
import addMargin from "../../services/add-margin";
import { FINANCING_MARGIN } from "../../config";
import addTimeBuffer from "../../services/add-time-buffer";
import FinancingAccountsDAO from "../financing-accounts/dao";
import { basisPointToPercentage } from "../../services/basis-point-to-percentage";
import InsufficientPlanError from "../../errors/insufficient-plan";
import ResourceNotFoundError from "../../errors/resource-not-found";

export function calculateAmounts(
  quote: UnsavedQuote
): {
  payNowTotalCents: number;
  payLaterTotalCents: number;
  timeTotalMs: number;
} {
  const payNowTotalCents = quote.units * quote.unitCostCents;
  const payLaterTotalCents = addMargin(payNowTotalCents, FINANCING_MARGIN);
  const timeTotalMsWithoutBuffer = sum([
    quote.creationTimeMs,
    quote.specificationTimeMs,
    quote.sourcingTimeMs,
    quote.samplingTimeMs,
    quote.preProductionTimeMs,
    quote.processTimeMs,
    quote.productionTimeMs,
    quote.fulfillmentTimeMs,
  ]);
  const timeTotalMs = addTimeBuffer(timeTotalMsWithoutBuffer);
  return { payNowTotalCents, payLaterTotalCents, timeTotalMs };
}

export async function getDesignProductionFeeBasisPoints(designId: string) {
  const plan = await PlansDAO.findLatestDesignTeamPlan(db, designId);
  if (!plan) {
    throw new InsufficientPlanError("No active subscriptions for this team");
  }

  return plan.costOfGoodsShareBasisPoints;
}

function fromUnsavedQuote(
  quote: UnsavedQuote,
  units: number,
  minimumOrderQuantity: number
): DesignQuote {
  const {
    payLaterTotalCents,
    payNowTotalCents,
    timeTotalMs,
  } = calculateAmounts(quote);

  const lineItems: DesignQuoteLineItem[] = [];

  if (quote.productionFeeCents > 0) {
    lineItems.push({
      description: "Service Fee",
      explainerCopy: "A fee for what you produce with us, based on your plan",
      cents: quote.productionFeeCents,
    });
  }

  return {
    designId: quote.designId!,
    payLaterTotalCents,
    payNowTotalCents,
    timeTotalMs,
    units,
    minimumOrderQuantity,
    lineItems,
  };
}

export async function calculateDesignQuote(
  costInput: PricingCostInput,
  units: number
): Promise<DesignQuote> {
  const productionFeeBasisPoints = await getDesignProductionFeeBasisPoints(
    costInput.designId
  );
  const unsavedQuote = await createUnsavedQuote(
    costInput,
    units,
    productionFeeBasisPoints
  );
  return fromUnsavedQuote(unsavedQuote, units, costInput.minimumOrderQuantity);
}

type CartSubtotal = Pick<
  CartDetails,
  "quotes" | "subtotalCents" | "combinedLineItems" | "totalUnits"
> & { teamTotalsMap: Record<string, number> };

function calculateSubtotal(
  trx: Knex.Transaction,
  quoteRequests: CreateQuotePayload[]
): Promise<CartSubtotal> {
  return quoteRequests.reduce(
    async (
      acc: Promise<CartSubtotal>,
      { designId, units }: CreateQuotePayload
    ) => {
      const existing = await acc;
      const costInputs = await PricingCostInputsDAO.findByDesignId({
        designId,
        trx,
      });

      if (costInputs.length === 0) {
        return existing;
      }

      const latestCostInput = costInputs[0];

      if (units === 0) {
        return {
          ...existing,
          quotes: [
            ...existing.quotes,
            {
              designId,
              payLaterTotalCents: 0,
              payNowTotalCents: 0,
              timeTotalMs: 0,
              units,
              minimumOrderQuantity: latestCostInput.minimumOrderQuantity,
              lineItems: [],
            },
          ],
        };
      }

      const designTeam = await TeamsDAO.findByDesign(trx, designId);
      if (!designTeam) {
        throw new ResourceNotFoundError(
          `Could not find a team for the design: ${designId}`
        );
      }
      const { id: teamId } = designTeam;

      const quote = await calculateDesignQuote(latestCostInput, units);

      const combinedLineItems = quote.lineItems.reduce(
        (combined: DesignQuoteLineItem[], lineItem: DesignQuoteLineItem) => {
          const existingLineItemIndex = combined.findIndex(
            (item: DesignQuoteLineItem) =>
              item.description === lineItem.description
          );

          if (existingLineItemIndex === -1) {
            return [...combined, lineItem];
          }

          return [
            ...combined.slice(0, existingLineItemIndex),
            {
              description: lineItem.description,
              explainerCopy: lineItem.explainerCopy,
              cents: combined[existingLineItemIndex].cents + lineItem.cents,
            },
            ...combined.slice(existingLineItemIndex + 1),
          ];
        },
        existing.combinedLineItems
      );

      return {
        ...existing,
        quotes: [...existing.quotes, quote],
        subtotalCents: existing.subtotalCents + quote.payNowTotalCents,
        totalUnits: existing.totalUnits + quote.units,
        combinedLineItems,
        teamTotalsMap: {
          ...existing.teamTotalsMap,
          [teamId]:
            (existing.teamTotalsMap[teamId] || 0) +
            quote.payNowTotalCents +
            quote.lineItems.reduce(
              (total: number, li: DesignQuoteLineItem) => total + li.cents,
              0
            ),
        },
      };
    },
    Promise.resolve({
      quotes: [],
      subtotalCents: 0,
      combinedLineItems: [],
      totalUnits: 0,
      teamTotalsMap: {},
    })
  );
}

interface DueCents {
  dueNowCents: number;
  dueLaterCents: number;
  balanceDueCents: number;
  creditAppliedCents: number;
  financingItems: FinancingItem[];
}

async function calculateDueCents(
  trx: Knex.Transaction,
  userId: string,
  cartSubtotal: CartSubtotal
): Promise<DueCents> {
  const withFees =
    cartSubtotal.subtotalCents +
    cartSubtotal.combinedLineItems.reduce(
      (cents: number, li: DesignQuoteLineItem) => cents + li.cents,
      0
    );
  const availableCreditCents = await CreditsDAO.getCreditAmount(userId, trx);
  const creditAppliedCents = Math.min(withFees, availableCreditCents);
  const teamEntries = Object.entries(cartSubtotal.teamTotalsMap);
  const teamsCount = teamEntries.length;

  return teamEntries.reduce(
    async (
      promiseAcc: Promise<DueCents>,
      [teamId, total]: [string, number]
    ): Promise<DueCents> => {
      const acc = await promiseAcc;
      const totalAfterCredits = total - creditAppliedCents / teamsCount;
      const teamFinancingAccount = await FinancingAccountsDAO.findActive(trx, {
        teamId,
      });

      if (
        !teamFinancingAccount ||
        teamFinancingAccount.availableBalanceCents === 0 ||
        totalAfterCredits === 0
      ) {
        return acc;
      }

      // Since the financing fee lowers the available balance, we need to leave
      // room in the financing account for the fee, which is why we're comparing
      // the available balance less what would be the fee
      const financingAppliedCents = Math.min(
        totalAfterCredits,
        Math.round(
          teamFinancingAccount.availableBalanceCents /
            (1 + basisPointToPercentage(teamFinancingAccount.feeBasisPoints))
        )
      );
      const financingFee = Math.round(
        financingAppliedCents *
          basisPointToPercentage(teamFinancingAccount.feeBasisPoints)
      );

      return {
        creditAppliedCents: acc.creditAppliedCents,
        balanceDueCents: acc.dueNowCents - financingAppliedCents,
        dueNowCents: acc.dueNowCents - financingAppliedCents,
        dueLaterCents: acc.dueLaterCents + financingAppliedCents + financingFee,
        financingItems: [
          ...acc.financingItems,
          {
            accountId: teamFinancingAccount.id,
            financedAmountCents: financingAppliedCents,
            feeAmountCents: financingFee,
            termLengthDays: teamFinancingAccount.termLengthDays,
          },
        ],
      };
    },
    Promise.resolve({
      creditAppliedCents,
      balanceDueCents: withFees - creditAppliedCents,
      dueNowCents: withFees - creditAppliedCents,
      dueLaterCents: 0,
      financingItems: [],
    })
  );
}

export async function getCartDetails(
  trx: Knex.Transaction,
  quoteRequests: CreateQuotePayload[],
  userId: string
): Promise<CartDetails> {
  const cartSubtotal = await calculateSubtotal(trx, quoteRequests);
  const { quotes, subtotalCents, combinedLineItems, totalUnits } = cartSubtotal;

  const {
    dueNowCents,
    dueLaterCents,
    balanceDueCents,
    creditAppliedCents,
    financingItems,
  } = await calculateDueCents(trx, userId, cartSubtotal);

  if (creditAppliedCents > 0) {
    combinedLineItems.push({
      description: "Credit Applied",
      explainerCopy: null,
      cents: creditAppliedCents * -1,
    });
  }

  if (financingItems.length > 0) {
    combinedLineItems.push({
      description: "Financing Fee",
      explainerCopy:
        "CALA Financing allows you to defer payment for your designs. You owe the total amount to CALA within the term defined in your Agreement",
      cents: financingItems.reduce(
        (total: number, item: FinancingItem) => total + item.feeAmountCents,
        0
      ),
    });
  }

  return {
    quotes,
    combinedLineItems,
    subtotalCents,
    dueNowCents,
    dueLaterCents,
    creditAppliedCents,
    balanceDueCents,
    totalUnits,
    financingItems,
  };
}
