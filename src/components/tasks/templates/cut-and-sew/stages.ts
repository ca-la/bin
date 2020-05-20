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
      "The Sampling phase is where your design comes to life. Partners take all your specifications and approvals from previous phases and turn it into a physical sample for you to approve.",
    ordering: 3,
    title: "Sampling",
    tasks: TaskTemplates.sampling,
  },
  {
    description:
      "Pre-production comes after final approval of the sample. This preparation phase ensures production is smooth and without delay.",
    ordering: 4,
    title: "Pre-Production",
    tasks: TaskTemplates.preProduction,
  },
  {
    description:
      "The Production phase. During this phase your full order is produced, quality checked and prepared for shipment.",
    ordering: 5,
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
