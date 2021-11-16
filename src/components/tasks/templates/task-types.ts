import {
  BidTaskTypeId,
  TaskType,
  taskTypesById,
} from "../../bid-task-types/types";
export {
  BidTaskTypeId,
  TaskType,
  taskTypesById,
} from "../../bid-task-types/types";

export const taskTypes: { [key: string]: TaskType } = {
  CALA: taskTypesById[BidTaskTypeId.CALA],
  DESIGN: taskTypesById[BidTaskTypeId.DESIGN],
  TECHNICAL_DESIGN: taskTypesById[BidTaskTypeId.TECHNICAL_DESIGN],
  PRODUCTION: taskTypesById[BidTaskTypeId.PRODUCTION],
  PRODUCT_PHOTOGRAPHY: taskTypesById[BidTaskTypeId.PRODUCT_PHOTOGRAPHY],
  QUALITY_CONTROL: taskTypesById[BidTaskTypeId.QUALITY_CONTROL],
  THREE_D_SERVICES: taskTypesById[BidTaskTypeId.THREE_D_SERVICES],
};
