import * as TaskTemplates from './tasks';

export interface StageTemplate {
  title: string;
  description: string;
  tasks: TaskTemplates.TaskTemplate[];
}

export const POST_CREATION_TEMPLATES: StageTemplate[] = [
  {
    description:
      'Creation is the first phase of every project. Add as much detail as you can in the form of references, sketches, annotations, and measurements about your design, materials, and artwork.',
    title: 'Creation',
    tasks: TaskTemplates.creation
  }
];

export const POST_APPROVAL_TEMPLATES: StageTemplate[] = [
  {
    description:
      'The Specification phase is where things get technical. During this phase you finalize the technical details–measurements, materials, and process–of your design.',
    title: 'Specification',
    tasks: TaskTemplates.specification
  },
  {
    description:
      'Sourcing is where things start to get fun. Partners will ship you physical material options for approval based on your material, and artwork specifications.',
    title: 'Sourcing',
    tasks: TaskTemplates.sourcing
  },
  {
    description:
      'The Sampling phase is where your design comes to life. Partners take all your specifications and approvals from previous phases and turn it into a physical sample for you to approve.',
    title: 'Sampling',
    tasks: TaskTemplates.sampling
  },
  {
    description:
      'Pre-production comes after final approval of the sample. This preparation phase ensures production is smooth and without delay.',
    title: 'Pre-Production',
    tasks: TaskTemplates.preProduction
  },
  {
    description:
      'The Production phase. During this phase your full order is produced, quality checked and prepared for shipment.',
    title: 'Production',
    tasks: TaskTemplates.production
  },
  {
    description:
      'Fulfillment is the final phase. Your products are shipped either directly to you or to a fulfillment partner who will warehouse, pack and ship orders to your customers directly.',
    title: 'Fulfillment',
    tasks: TaskTemplates.fulfillment
  }
];
