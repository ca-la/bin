import { fromSchema } from "../../services/cala-component/cala-adapter";
import { defaultEncoder } from "../../services/data-adapter";
import { Serialized } from "../../types/serialized";
import { DesignEvent } from "../design-events/types";
import {
  bidDbRowSchema,
  bidDbSchema,
  bidRowSchema,
  bidSchema,
  BidWithEvents,
  BidWithEventsRow,
  bidWithEventsRowSchema,
  bidWithEventsSchema,
} from "./types";

export const rawAdapter = fromSchema({
  modelSchema: bidDbSchema,
  rowSchema: bidDbRowSchema,
});

export const dataAdapter = fromSchema({
  modelSchema: bidSchema,
  rowSchema: bidRowSchema,
});

export const withEventsDataAdapter = fromSchema({
  modelSchema: bidWithEventsSchema,
  rowSchema: bidWithEventsRowSchema,
  encodeTransformer: (row: BidWithEventsRow): BidWithEvents => {
    const encoded = defaultEncoder<BidWithEventsRow, BidWithEvents>(row);
    const { designEvents } = encoded;
    return {
      ...encoded,
      designEvents: ((designEvents as unknown) as Serialized<
        DesignEvent
      >[]).map(
        (serialized: Serialized<DesignEvent>): DesignEvent => ({
          ...serialized,
          createdAt: new Date(serialized.createdAt),
        })
      ),
    };
  },
});
