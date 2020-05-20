import * as TaskTemplates from "./tasks";
import { StageTemplate } from "../stage-template";
import { DesignPhase } from "../../../../domain-objects/task-template";
import { POST_CREATION_TEMPLATES } from "../shared/stages";

const POST_APPROVAL_TEMPLATES: StageTemplate[] = [
  {
    description:
      "Sourcing is where things start to get fun. Partners will ship you physical material options for approval based on your material, and artwork specifications.",
    ordering: 2,
    title: "Sourcing",
    tasks: TaskTemplates.sourcing,
  },
  {
    description:
      "The Production phase. During this phase your full order is produced, quality checked and prepared for shipment.",
    ordering: 3,
    title: "Production",
    tasks: TaskTemplates.production,
  },
];

export function getByPhase(phase: DesignPhase): StageTemplate[] {
  if (phase === "POST_CREATION") {
    return POST_CREATION_TEMPLATES;
  }

  return POST_APPROVAL_TEMPLATES;
}
