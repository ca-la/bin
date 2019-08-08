import { TaskType } from './task-types';

export interface TaskTemplate {
  taskType: TaskType;
  title: string;
  description: string;
}
