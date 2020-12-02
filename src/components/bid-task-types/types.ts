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
}

export const taskTypesById: Record<BidTaskTypeId, TaskType> = {
  [BidTaskTypeId.CALA]: {
    id: "065f32d9-7d25-49f8-b25d-970e148b59d8",
    title: "CALA",
    assigneeRole: CollaboratorRole.CALA,
  },
  [BidTaskTypeId.DESIGN]: {
    id: "8635e5f1-6cec-4984-991b-af664d1d51ca",
    title: "Design",
    assigneeRole: CollaboratorRole.DESIGNER,
  },
  [BidTaskTypeId.TECHNICAL_DESIGN]: {
    id: "e0dcffd3-9352-47d8-85a2-851cfb6ac437",
    title: "Technical Design",
    assigneeRole: CollaboratorRole.PARTNER,
  },
  [BidTaskTypeId.PRODUCTION]: {
    id: "31c52ddf-88be-4ed2-9f32-8279ae62fcab",
    title: "Production",
    assigneeRole: CollaboratorRole.PARTNER,
  },
  [BidTaskTypeId.PRODUCT_PHOTOGRAPHY]: {
    id: "9a188eba-b472-4b50-85ac-eb86319e642b",
    title: "Product Photography",
    assigneeRole: CollaboratorRole.PARTNER,
  },
  [BidTaskTypeId.QUALITY_CONTROL]: {
    id: "48520934-a0e9-436d-ab56-cb2829ccdfed",
    title: "Quality Control",
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
};
