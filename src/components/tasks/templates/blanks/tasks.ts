import { TaskTemplate } from "../task-template";
import { taskTypes } from "../task-types";

export const sourcing: TaskTemplate[] = [
  {
    description: "Add tracking numbers",
    taskType: taskTypes.CALA,
    title: "Confirm materials have been ordered",
  },
  {
    description: "Add tracking numbers",
    taskType: taskTypes.CALA,
    title: "Confirm labels have been ordered",
  },
];

export const production: TaskTemplate[] = [
  {
    description: "",
    taskType: taskTypes.PRODUCTION,
    title: "Complete QA inspection",
  },
  {
    description: "",
    taskType: taskTypes.PRODUCTION,
    title: "Fold, Bag and Barcode Products",
  },
  {
    description: "Add tracking numbers",
    taskType: taskTypes.CALA,
    title: "Confirm product has been shipped",
  },
  {
    description: "",
    taskType: taskTypes.DESIGN,
    title: "Confirm Receipt of Products",
  },
];
