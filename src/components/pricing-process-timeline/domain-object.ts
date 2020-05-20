import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";

export default interface PricingProcessTimeline {
  id: string;
  version: number;
  createdAt: Date;
  minimumUnits: number;
  uniqueProcesses: number;
  timeMs: number;
}

export interface PricingProcessTimelineRow {
  id: string;
  version: number;
  created_at: string;
  minimum_units: number;
  unique_processes: number;
  time_ms: string;
}

const encode = (row: PricingProcessTimelineRow): PricingProcessTimeline => {
  return {
    createdAt: new Date(row.created_at),
    id: row.id,
    minimumUnits: row.minimum_units,
    timeMs: parseInt(row.time_ms, 10),
    uniqueProcesses: row.unique_processes,
    version: row.version,
  };
};

const decode = (data: PricingProcessTimeline): PricingProcessTimelineRow => {
  return {
    created_at: data.createdAt.toISOString(),
    id: data.id,
    minimum_units: data.minimumUnits,
    time_ms: data.timeMs.toString(),
    unique_processes: data.uniqueProcesses,
    version: data.version,
  };
};

export const dataAdapter = new DataAdapter<
  PricingProcessTimelineRow,
  PricingProcessTimeline
>(encode, decode);

export function isPricingProcessTimelineRow(
  row: object
): row is PricingProcessTimelineRow {
  return hasProperties(
    row,
    "id",
    "version",
    "minimum_units",
    "unique_processes",
    "time_ms",
    "created_at"
  );
}
