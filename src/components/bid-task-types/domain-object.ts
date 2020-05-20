import { hasProperties } from "@cala/ts-lib";
import DataAdapter from "../../services/data-adapter";

export default interface BidTaskType {
  id: string;
  pricingBidId: string;
  taskTypeId: string;
}

export interface BidTaskTypeRow {
  id: string;
  pricing_bid_id: string;
  task_type_id: string;
}

export const dataAdapter = new DataAdapter<BidTaskTypeRow, BidTaskType>();

export function isBidTaskTypeRow(row: any): row is BidTaskTypeRow {
  return hasProperties(row, "id", "pricing_bid_id", "task_type_id");
}

export function isBidTaskType(data: any): data is BidTaskType {
  return hasProperties(data, "id", "pricingBidId", "taskTypeId");
}
