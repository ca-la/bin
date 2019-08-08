import { TaskTemplate } from '../task-template';
import { taskTypes } from '../task-types';

export const creation: TaskTemplate[] = [
  {
    description: "It's OK if this is a rough idea",
    taskType: taskTypes.DESIGN,
    title: 'Add your sketch'
  },
  {
    description:
      "Let us know what you're thinking for style, fit, fabric, and trim details",
    taskType: taskTypes.DESIGN,
    title: 'Add your reference images'
  },
  {
    description:
      'If you have specific fabric & trim preferences, let us know (type, weight, content, color, print, or wash)',
    taskType: taskTypes.DESIGN,
    title: 'Add your materials'
  }
];

export const specification: TaskTemplate[] = [
  {
    description:
      'Tell us any specific measurements and placement for details, trims, or artwork.',
    taskType: taskTypes.DESIGN,
    title: 'Add your measurements'
  },
  {
    description:
      'Add as many comments as needed to help us understand your vision.',
    taskType: taskTypes.DESIGN,
    title: 'Add your comments with construction details'
  },
  {
    description:
      "Add your files under the 'Artwork' tab for prints or patterns (vector file format preferred; but we can work with anything over 300dpi).",
    taskType: taskTypes.DESIGN,
    title: 'Upload your artwork'
  },
  {
    description:
      'Add a sketch or comment detailing where you want your brand and/or care labels.',
    taskType: taskTypes.DESIGN,
    title: 'Add your label placement details'
  },
  {
    description: 'This is where we will send your samples.',
    taskType: taskTypes.DESIGN,
    title: 'Confirm your shipping address'
  },
  {
    description: 'The default sample size is Medium.',
    taskType: taskTypes.DESIGN,
    title: 'What size do you want your sample to be?'
  },
  {
    description: '',
    taskType: taskTypes.TECHNICAL_DESIGN,
    title: 'Complete technical consulting'
  }
];
