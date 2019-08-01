import * as TaskTemplates from './tasks';

export interface StageTemplate {
  description: string;
  id: string;
  ordering: number;
  title: string;
  tasks: TaskTemplates.TaskTemplate[];
}

export const POST_CREATION_TEMPLATES: StageTemplate[] = [
  {
    description:
      'Creation is the first phase of every project. Add as much detail as you can in the form of references, sketches, annotations, and measurements about your design, materials, and artwork.',
    id: '8b7a35db-5b0d-4348-9ced-3388a5b773eb',
    ordering: 0,
    title: 'Creation',
    tasks: TaskTemplates.creation
  },
  {
    description:
      'The Specification phase is where things get technical. During this phase you finalize the technical details–measurements, materials, and process–of your design.',
    id: '3a50af7c-1663-4a08-af15-7630faee69ef',
    ordering: 1,
    title: 'Specification',
    tasks: TaskTemplates.specification
  }
];

export const POST_APPROVAL_TEMPLATES: StageTemplate[] = [
  {
    description:
      'Sourcing is where things start to get fun. Partners will ship you physical material options for approval based on your material, and artwork specifications.',
    id: 'fadd74b8-952e-448b-8eb4-c8f9c21f7500',
    ordering: 2,
    title: 'Sourcing',
    tasks: TaskTemplates.sourcing
  },
  {
    description:
      'The Sampling phase is where your design comes to life. Partners take all your specifications and approvals from previous phases and turn it into a physical sample for you to approve.',
    id: '12c5db32-15fa-44e0-9194-fd7969c19ff0',
    ordering: 3,
    title: 'Sampling',
    tasks: TaskTemplates.sampling
  },
  {
    description:
      'Pre-production comes after final approval of the sample. This preparation phase ensures production is smooth and without delay.',
    id: 'a70f8dba-283d-47ed-9dd5-e6981ce66a47',
    ordering: 4,
    title: 'Pre-Production',
    tasks: TaskTemplates.preProduction
  },
  {
    description:
      'The Production phase. During this phase your full order is produced, quality checked and prepared for shipment.',
    id: '59b3ac4f-ceee-47d5-9c12-21b1d0069f32',
    ordering: 5,
    title: 'Production',
    tasks: TaskTemplates.production
  }
];
