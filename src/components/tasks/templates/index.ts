import { DesignPhase } from "../../../domain-objects/task-template";
import { Complexity } from "../../../domain-objects/pricing";
import * as BlankStageTemplates from "./blanks/stages";
import * as CutAndSewStageTemplates from "./cut-and-sew/stages";
import { StageTemplate } from "./stage-template";

export function getTemplatesFor(
  phase: DesignPhase,
  complexity: Complexity
): StageTemplate[] {
  if (complexity === "BLANK") {
    return BlankStageTemplates.getByPhase(phase);
  }

  return CutAndSewStageTemplates.getByPhase(phase);
}

export { TaskType, taskTypes, taskTypesById } from "./task-types";
export { StageTemplate } from "./stage-template";
export { TaskTemplate } from "./task-template";
