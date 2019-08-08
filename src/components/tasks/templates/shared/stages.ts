import * as TaskTemplates from './tasks';
import { StageTemplate } from '../stage-template';

export const POST_CREATION_TEMPLATES: StageTemplate[] = [
  {
    description:
      'Creation is the first phase of every project. Add as much detail as you can in the form of references, sketches, annotations, and measurements about your design, materials, and artwork.',
    ordering: 0,
    title: 'Creation',
    tasks: TaskTemplates.creation
  },
  {
    description:
      'The Specification phase is where things get technical. During this phase you finalize the technical details–measurements, materials, and process–of your design.',
    ordering: 1,
    title: 'Specification',
    tasks: TaskTemplates.specification
  }
];
