import { TaskTemplate } from "./task-template";

export interface StageTemplate {
  description: string;
  ordering: number;
  title: string;
  tasks: TaskTemplate[];
}
