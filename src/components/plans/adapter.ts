import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { defaultDecoder, defaultEncoder } from "../../services/data-adapter";
import parseNumericString from "../../services/parse-numeric-string";
import {
  Plan,
  PlanDb,
  PlanDbRow,
  planDbRowSchema,
  planDbSchema,
  PlanRow,
  planRowSchema,
  planSchema,
} from "./types";

export const rawDataAdapter = buildAdapter({
  domain: "Plan",
  requiredProperties: [],
  encodeTransformer: (row: PlanDbRow): PlanDb =>
    planDbSchema.parse({
      ...defaultEncoder<PlanDbRow, PlanDb>(row),
      maximumSeatsPerTeam:
        row.maximum_seats_per_team === null
          ? null
          : parseNumericString(row.maximum_seats_per_team),
      monthlyCostCents: parseNumericString(row.monthly_cost_cents),
      baseCostPerBillingIntervalCents: parseNumericString(
        row.base_cost_per_billing_interval_cents
      ),
      perSeatCostPerBillingIntervalCents: parseNumericString(
        row.per_seat_cost_per_billing_interval_cents
      ),
    }),
  decodeTransformer: (data: PlanDb): PlanDbRow =>
    planDbRowSchema.parse({
      ...defaultDecoder<PlanDb, PlanDbRow>(data),
      maximum_seats_per_team:
        data.maximumSeatsPerTeam === null
          ? null
          : String(data.maximumSeatsPerTeam),
      monthlyCostCents: String(data.monthlyCostCents),
      base_cost_per_billing_interval_cents: String(
        data.baseCostPerBillingIntervalCents
      ),
      per_seat_cost_per_billing_interval_cents: String(
        data.perSeatCostPerBillingIntervalCents
      ),
    }),
});

export const dataAdapter = buildAdapter({
  domain: "Plan",
  requiredProperties: [],
  encodeTransformer: (row: PlanRow): Plan =>
    planSchema.parse({
      ...defaultEncoder<PlanRow, Plan>(row),
      maximumSeatsPerTeam:
        row.maximum_seats_per_team === null
          ? null
          : parseNumericString(row.maximum_seats_per_team),
      monthlyCostCents: parseNumericString(row.monthly_cost_cents),
      baseCostPerBillingIntervalCents: parseNumericString(
        row.base_cost_per_billing_interval_cents
      ),
      perSeatCostPerBillingIntervalCents: parseNumericString(
        row.per_seat_cost_per_billing_interval_cents
      ),
    }),
  decodeTransformer: (data: Plan): PlanRow =>
    planRowSchema.parse({
      ...defaultDecoder<PlanDb, PlanDbRow>(data),
      maximum_seats_per_team:
        data.maximumSeatsPerTeam === null
          ? null
          : String(data.maximumSeatsPerTeam),
      monthlyCostCents: String(data.monthlyCostCents),
      base_cost_per_billing_interval_cents: String(
        data.baseCostPerBillingIntervalCents
      ),
      per_seat_cost_per_billing_interval_cents: String(
        data.perSeatCostPerBillingIntervalCents
      ),
    }),
});
