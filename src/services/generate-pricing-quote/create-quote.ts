import Knex from "knex";
import uuid from "node-uuid";

import PricingProcess from "../../domain-objects/pricing-process";
import {
  create,
  createPricingProcesses,
  findLatestValuesForRequest,
  findMatchingOrCreateInput,
  findVersionValuesForRequest,
} from "../../dao/pricing-quotes";
import {
  PricingQuote,
  PricingQuoteValues,
} from "../../domain-objects/pricing-quote";
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import {
  PricingCostInput,
  UncomittedCostInput,
} from "../../components/pricing-cost-inputs/types";
import DesignEventsDAO from "../../components/design-events/dao";
import { identity } from "../../services/cala-component/cala-dao";
import { logServerError } from "../../services/logger";
import ApprovalStepsDAO from "../../components/approval-steps/dao";
import { ApprovalStepType } from "../../components/approval-steps/types";
import * as ProductDesignVariantsDAO from "../../components/product-design-variants/dao";
import { findMinimalByIds } from "../../components/product-designs/dao/dao";
import { templateDesignEvent } from "../../components/design-events/types";
import InvalidDataError from "../../errors/invalid-data";
import ResourceNotFoundError from "../../errors/resource-not-found";
import {
  buildQuoteValuesPool,
  getQuoteValuesFromPool,
  QuoteValuesPool,
} from "./quote-values";
import { getDesignProductionFeeBasisPoints } from "../../components/design-quotes/service";
import { CreateQuotePayload, UnsavedQuote } from "./types";
import { calculateQuote } from "./calculate-quote";

export async function createUnsavedQuote(
  costInput: PricingCostInput,
  units: number,
  productionFeeBasisPoints: number
): Promise<UnsavedQuote> {
  const quoteValues = await findVersionValuesForRequest(costInput, units);

  return calculateQuote(
    costInput,
    units,
    quoteValues,
    productionFeeBasisPoints
  );
}

export async function createUnsavedQuoteWithLatest(
  costInput: UncomittedCostInput,
  units: number,
  productionFeeBasisPoints: number
): Promise<UnsavedQuote> {
  const quoteValues = await findLatestValuesForRequest(costInput, units);

  return calculateQuote(
    costInput,
    units,
    quoteValues,
    productionFeeBasisPoints
  );
}

async function generatePricingQuoteFromPool(
  ktx: Knex,
  costInput: PricingCostInput,
  pool: QuoteValuesPool,
  units: number
): Promise<PricingQuote> {
  const quoteValues = getQuoteValuesFromPool(costInput, pool, units);
  const productionFeeBasisPoints = await getDesignProductionFeeBasisPoints(
    costInput.designId
  );
  const pricingQuoteInputId = await getQuoteInput(quoteValues);

  const unsavedQuote = calculateQuote(
    costInput,
    units,
    quoteValues,
    productionFeeBasisPoints
  );

  const createdQuote = await create(
    { ...unsavedQuote, pricingQuoteInputId },
    ktx
  );

  await createPricingProcesses(
    quoteValues.processes.map((process: PricingProcess) => ({
      id: uuid.v4(),
      pricing_process_id: process.id,
      pricing_quote_id: createdQuote.id,
    })),
    ktx
  );

  return Object.assign(createdQuote, { processes: quoteValues.processes });
}

async function getQuoteInput(values: PricingQuoteValues): Promise<string> {
  const pricingQuoteInput = {
    care_label_id: values.careLabel.id,
    constant_id: values.constantId,
    id: uuid.v4(),
    margin_id: values.margin.id,
    pricing_process_timeline_id:
      values.processTimeline && values.processTimeline.id,
    product_material_id: values.material.id,
    product_type_id: values.type.id,
  };
  const pricingQuoteInputRow = await findMatchingOrCreateInput(
    pricingQuoteInput
  );

  if (!pricingQuoteInputRow) {
    throw new ResourceNotFoundError("Could not find or create PricingInput");
  }

  return pricingQuoteInputRow.id;
}

export async function createQuotes(
  quotePayloads: CreateQuotePayload[],
  userId: string,
  trx: Knex.Transaction
): Promise<PricingQuote[]> {
  const quotes = [];
  const designIds = quotePayloads.map((qp: CreateQuotePayload) => qp.designId);
  const costInputsByDesignId = await PricingCostInputsDAO.findLatestForEachDesignId(
    trx,
    designIds
  );
  const pool = await buildQuoteValuesPool(
    trx,
    quotePayloads,
    costInputsByDesignId
  );

  for (const payload of quotePayloads) {
    const { designId, units } = payload;
    const unitsNumber = Number(units);

    const checkoutStep = await ApprovalStepsDAO.findOne(trx, {
      designId,
      type: ApprovalStepType.CHECKOUT,
    });
    if (!checkoutStep) {
      throw new Error("Could not find checkout step for collection submission");
    }

    const latestInput = costInputsByDesignId[designId];
    if (!latestInput) {
      throw new Error(
        `No costing inputs associated with the design #${designId}`
      );
    }

    const colorwayUnitList = await ProductDesignVariantsDAO.getUnitsPerColorways(
      designId,
      trx
    );
    if (colorwayUnitList.length === 0) {
      logServerError(
        `Payment violates minimum order quantity per colorway. Please hit back to update unit quantity for ${designId}`
      );
      const designs = await findMinimalByIds([designId]);
      throw new InvalidDataError(
        `Payment violates minimum order quantity per colorway. Please hit back to update unit quantity for ${designs[0].title}`
      );
    }
    for (const colorwayUnits of colorwayUnitList) {
      if (colorwayUnits.units < latestInput.minimumOrderQuantity) {
        logServerError(
          `Payment violates minimum order quantity per colorway. Please hit back to update unit quantity for the colorway "${colorwayUnits.colorName}" of design ${designId}`
        );
        const designs = await findMinimalByIds([designId]);
        throw new InvalidDataError(
          `Payment violates minimum order quantity per colorway. Please hit back to update unit quantity for the colorway "${colorwayUnits.colorName}" of ${designs[0].title}`
        );
      }
    }

    const quote = await generatePricingQuoteFromPool(
      trx,
      latestInput,
      pool,
      unitsNumber
    );
    quotes.push(quote);

    await DesignEventsDAO.create(
      trx,
      {
        ...templateDesignEvent,
        actorId: userId,
        approvalStepId: checkoutStep.id,
        createdAt: new Date(),
        designId,
        id: uuid.v4(),
        quoteId: quote.id,
        type: "COMMIT_QUOTE",
      },
      identity,
      // we don't want to send real-time updates to the
      // user on every design event creation
      // this logic is moved to the API worker as
      // otherwise this operation takes ~1s per quote
      { shouldEmitEvent: false }
    );
  }

  return quotes;
}
