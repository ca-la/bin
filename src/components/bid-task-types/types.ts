import * as z from "zod";

import { CollaboratorRole } from "../collaborators/types";

export interface TaskType {
  id: string;
  title: string;
  assigneeRole: CollaboratorRole;
}

export enum BidTaskTypeId {
  CALA = "065f32d9-7d25-49f8-b25d-970e148b59d8",
  DESIGN = "8635e5f1-6cec-4984-991b-af664d1d51ca",
  TECHNICAL_DESIGN = "e0dcffd3-9352-47d8-85a2-851cfb6ac437",
  PRODUCTION = "31c52ddf-88be-4ed2-9f32-8279ae62fcab",
  PRODUCT_PHOTOGRAPHY = "9a188eba-b472-4b50-85ac-eb86319e642b",
  QUALITY_CONTROL = "48520934-a0e9-436d-ab56-cb2829ccdfed",
  THREE_D_SERVICES = "cfcd9846-b454-4e7f-9d7e-dff91515bb90",
}
export const bidTaskTypeIdSchema = z.nativeEnum(BidTaskTypeId);

export const taskTypesById: Record<BidTaskTypeId, TaskType> = {
  [BidTaskTypeId.CALA]: {
    id: BidTaskTypeId.CALA,
    title: "CALA",
    assigneeRole: CollaboratorRole.CALA,
  },
  [BidTaskTypeId.DESIGN]: {
    id: BidTaskTypeId.DESIGN,
    title: "Design",
    assigneeRole: CollaboratorRole.DESIGNER,
  },
  [BidTaskTypeId.TECHNICAL_DESIGN]: {
    id: BidTaskTypeId.TECHNICAL_DESIGN,
    title: "Technical Design",
    assigneeRole: CollaboratorRole.PARTNER,
  },
  [BidTaskTypeId.PRODUCTION]: {
    id: BidTaskTypeId.PRODUCTION,
    title: "Production",
    assigneeRole: CollaboratorRole.PARTNER,
  },
  [BidTaskTypeId.PRODUCT_PHOTOGRAPHY]: {
    id: BidTaskTypeId.PRODUCT_PHOTOGRAPHY,
    title: "Product Photography",
    assigneeRole: CollaboratorRole.PARTNER,
  },
  [BidTaskTypeId.QUALITY_CONTROL]: {
    id: BidTaskTypeId.QUALITY_CONTROL,
    title: "Quality Control",
    assigneeRole: CollaboratorRole.PARTNER,
  },
  [BidTaskTypeId.THREE_D_SERVICES]: {
    id: BidTaskTypeId.THREE_D_SERVICES,
    title: "3D Services",
    assigneeRole: CollaboratorRole.PARTNER,
  },
};

export const idsByTaskTypeTitle: Record<string, BidTaskTypeId> = {
  [taskTypesById[BidTaskTypeId.CALA].title]: BidTaskTypeId.CALA,
  [taskTypesById[BidTaskTypeId.DESIGN].title]: BidTaskTypeId.DESIGN,
  [taskTypesById[BidTaskTypeId.TECHNICAL_DESIGN].title]:
    BidTaskTypeId.TECHNICAL_DESIGN,
  [taskTypesById[BidTaskTypeId.PRODUCTION].title]: BidTaskTypeId.PRODUCTION,
  [taskTypesById[BidTaskTypeId.PRODUCT_PHOTOGRAPHY].title]:
    BidTaskTypeId.PRODUCT_PHOTOGRAPHY,
  [taskTypesById[BidTaskTypeId.QUALITY_CONTROL].title]:
    BidTaskTypeId.QUALITY_CONTROL,
  [taskTypesById[BidTaskTypeId.THREE_D_SERVICES].title]:
    BidTaskTypeId.THREE_D_SERVICES,
};
