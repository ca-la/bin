import { CollaboratorRole } from '../../collaborators/domain-objects/role';

interface TaskType {
  id: string;
  title: string;
  assigneeRole: CollaboratorRole;
}

export const taskTypes: { [key: string]: TaskType } = {
  CALA: {
    id: '065f32d9-7d25-49f8-b25d-970e148b59d8',
    title: 'CALA',
    assigneeRole: CollaboratorRole.CALA
  },
  DESIGN: {
    id: '8635e5f1-6cec-4984-991b-af664d1d51ca',
    title: 'Design',
    assigneeRole: CollaboratorRole.DESIGNER
  },
  TECHNICAL_DESIGN: {
    id: 'e0dcffd3-9352-47d8-85a2-851cfb6ac437',
    title: 'Technical Design',
    assigneeRole: CollaboratorRole.PARTNER
  },
  PRODUCTION: {
    id: '31c52ddf-88be-4ed2-9f32-8279ae62fcab',
    title: 'Production',
    assigneeRole: CollaboratorRole.PARTNER
  },
  PRODUCT_PHOTOGRAPHY: {
    id: '9a188eba-b472-4b50-85ac-eb86319e642b',
    title: 'Product Photography',
    assigneeRole: CollaboratorRole.PARTNER
  }
};

export interface TaskTemplate {
  taskType: TaskType;
  title: string;
  description: string;
}

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
    title: 'Upload your artwork '
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

export const sourcing: TaskTemplate[] = [
  {
    description: 'This is used for your reference materials.',
    taskType: taskTypes.CALA,
    title: 'Create shipping label'
  },
  {
    description: 'Send over your references for fit, fabric, color, wash, etc.',
    taskType: taskTypes.DESIGN,
    title: 'Send your reference samples'
  },
  {
    description: 'Let us know you recieved the samples for this design.',
    taskType: taskTypes.PRODUCTION,
    title: 'Confirm receipt of reference samples'
  },
  {
    description: "Source all components on the 'Materials' tab.",
    taskType: taskTypes.PRODUCTION,
    title: 'Send requested materials to designer for approval'
  },
  {
    description: 'Approve materials, processes, and artwork options.',
    taskType: taskTypes.DESIGN,
    title: 'Approve sourced materials'
  }
];

export const sampling: TaskTemplate[] = [
  {
    description: 'Communicate when the pattern sample will be done.',
    taskType: taskTypes.PRODUCTION,
    title: 'Create pattern'
  },
  {
    description: 'Communicate when the sample will be done.',
    taskType: taskTypes.PRODUCTION,
    title: 'Create sample'
  },
  {
    description:
      'Capture and upload the front, back, and details on dress form or mannequin.',
    taskType: taskTypes.PRODUCTION,
    title: 'Add photo of completed sample'
  },
  {
    description: 'Confirm the sample was sent.',
    taskType: taskTypes.PRODUCTION,
    title: 'Send the sample'
  },
  {
    description:
      'Approve fit, material, and artwork. Have suggestions? Add some comments.',
    taskType: taskTypes.DESIGN,
    title: 'Approve your sample'
  }
];

export const preProduction: TaskTemplate[] = [
  {
    description:
      "Confirm that you've completed the grading process – if necessary.",
    taskType: taskTypes.PRODUCTION,
    title: 'Grading complete'
  },
  {
    description:
      'Add the date you expect the materials to arrive and be ready for production.',
    taskType: taskTypes.PRODUCTION,
    title: 'Purchase raw materials for production'
  },
  {
    description:
      'Make sure you account for all fabric, trims, labels, and packaging.',
    taskType: taskTypes.PRODUCTION,
    title: 'Confirm receipt of all production materials'
  },
  {
    description: "Send back the designer's reference items.",
    taskType: taskTypes.PRODUCTION,
    title: 'Return reference items'
  }
];

export const production: TaskTemplate[] = [
  {
    description:
      'Confirm that garment is properly inspected and meets quality criteria.',
    taskType: taskTypes.PRODUCTION,
    title: 'Complete QA inspection'
  },
  {
    description: "Upload flat front and back photography to 'Design' tab.",
    taskType: taskTypes.PRODUCT_PHOTOGRAPHY,
    title: 'Upload e-commerce photos'
  },
  {
    description:
      'Put garment in garment bags and place barcode stickers on the outside.',
    taskType: taskTypes.PRODUCTION,
    title: 'Complete product packing'
  },
  {
    description: 'Advise tracking number and estimated delivery date.',
    taskType: taskTypes.PRODUCTION,
    title: 'Confirm order has shipped'
  },
  {
    description: "Let us know that you've successfully received your order 🎉.",
    taskType: taskTypes.DESIGN,
    title: 'Confirm receipt of products'
  }
];
