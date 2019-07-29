import { CollaboratorRole } from '../../collaborators/domain-objects/role';

interface TaskType {
  title: string;
  assigneeRole: CollaboratorRole;
}

const taskTypes: { [key: string]: TaskType } = {
  CALA: {
    title: 'CALA',
    assigneeRole: CollaboratorRole.CALA
  },
  DESIGN: {
    title: 'Design',
    assigneeRole: CollaboratorRole.DESIGNER
  },
  TECHNICAL_DESIGN: {
    title: 'Technical Design',
    assigneeRole: CollaboratorRole.PARTNER
  },
  PRODUCTION: {
    title: 'Production',
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
      'Feel free to markup a sketch to help us understand your vision.',
    taskType: taskTypes.DESIGN,
    title: 'Add your annotations with construction details'
  },
  {
    description:
      'Give us your files for prints or patterns (SVG or AI preferred; but we can work with anything).',
    taskType: taskTypes.DESIGN,
    title: 'Upload your artwork '
  },
  {
    description:
      'Add a sketch or annotation detailing where you want your brand and/or care labels.',
    taskType: taskTypes.DESIGN,
    title: 'Add your label placement details'
  },
  {
    description:
      'Let us know how you want your customer to receive your product.',
    taskType: taskTypes.DESIGN,
    title: 'Add your packaging details'
  },
  {
    description: 'This is where we will send your samples.',
    taskType: taskTypes.DESIGN,
    title: 'Confirm your shipping address'
  }
];

export const sourcing: TaskTemplate[] = [
  {
    description: 'For reference materials',
    taskType: taskTypes.DESIGN,
    title: 'Create shipping label'
  },
  {
    description:
      'Review material specifications and submissions. Request further info if something is missing.',
    taskType: taskTypes.PRODUCTION,
    title: 'Review material specifications'
  },
  {
    description:
      'Send over your references for fit, fabric, color, wash, etc. ',
    taskType: taskTypes.DESIGN,
    title: 'Send your reference samples'
  },
  {
    description: 'Let us know you recieved the samples for this design',
    taskType: taskTypes.PRODUCTION,
    title: 'Confirm receipt of reference samples'
  },
  {
    description:
      'Add images and annotate details of options for fabric, trim, processes and artwork',
    taskType: taskTypes.PRODUCTION,
    title: 'Add material options for designer review'
  },
  {
    description:
      "Review materials, processes, and artwork options and approve. If it looks good we'll send you a physical version.",
    taskType: taskTypes.DESIGN,
    title: 'Review options and provide feedback'
  },
  {
    description: 'For material options for the designer to review',
    taskType: taskTypes.CALA,
    title: 'Create shipping label'
  },
  {
    description: "Confirm that the designer's materials were shipped",
    taskType: taskTypes.PRODUCTION,
    title: 'Send material options to designer for review'
  },
  {
    description:
      "Create an 'Approve' task for each item the designer needs to approve",
    taskType: taskTypes.PRODUCTION,
    title: 'Create approval tasks for each sourced item'
  },
  {
    description:
      'Be sure to review and approval all materials, processes, and artwork options for the sample',
    taskType: taskTypes.DESIGN,
    title: 'Complete all approvals'
  },
  {
    description: 'The default size is Medium',
    taskType: taskTypes.DESIGN,
    title: 'What size do you want your sample to be?'
  },
  {
    description: 'Place order for all materials needed for the sample',
    taskType: taskTypes.PRODUCTION,
    title: 'Purchase materials for sample'
  }
];

export const sampling: TaskTemplate[] = [
  {
    description: 'Set the due date for when the pattern sample will be done',
    taskType: taskTypes.PRODUCTION,
    title: 'Create pattern'
  },
  {
    description: 'Set the due date for when the sample will be done',
    taskType: taskTypes.PRODUCTION,
    title: 'Create sample'
  },
  {
    description:
      'Capture and upload the front, back, and details on dress form or mannequin',
    taskType: taskTypes.PRODUCTION,
    title: 'Add photo of completed sample'
  },
  {
    description: 'Make the shipping label for the sample',
    taskType: taskTypes.CALA,
    title: 'Create shipping label'
  },
  {
    description: 'Confirm the sample was sent',
    taskType: taskTypes.PRODUCTION,
    title: 'Send the sample'
  },
  {
    description:
      'Tell us how the sample fits. Request changes or approve this sample.',
    taskType: taskTypes.DESIGN,
    title: 'Approve fit of your sample'
  },
  {
    description:
      'Are the materials what you were expecting? Request changes or approve this sample',
    taskType: taskTypes.DESIGN,
    title: "Approve sample's materials"
  },
  {
    description:
      'Is the art placed correctly? Does anything look off? Request changes or approve this sample.',
    taskType: taskTypes.DESIGN,
    title: "Approve sample's artwork"
  },
  {
    description:
      'After this approval, the design cannot change. Production will move forward and cannot be canceled.',
    taskType: taskTypes.DESIGN,
    title: 'Final Sample Approval'
  },
  {
    description:
      'Make sure you understand all specifications and quantities required for production completion',
    taskType: taskTypes.PRODUCTION,
    title: 'Confirm final specs and quantities for production'
  }
];

export const preProduction: TaskTemplate[] = [
  {
    description:
      'Tell us how much a fully packed product weighs, so we can calculate shipping',
    taskType: taskTypes.PRODUCTION,
    title: 'Add final packaged product weight'
  },
  {
    description: 'Tell us the per-item tax rate and code for each product',
    taskType: taskTypes.PRODUCTION,
    title: 'Add import tax rate for garment'
  },
  {
    description: 'Make the shipping label for the return of reference items',
    taskType: taskTypes.CALA,
    title: 'Create shipping label '
  },
  {
    description: "Send back the Designer's reference items",
    taskType: taskTypes.PRODUCTION,
    title: 'Return reference items'
  },
  {
    description:
      "Confirm that you've completed the grading process – if necessary",
    taskType: taskTypes.PRODUCTION,
    title: 'Grading complete'
  },
  {
    description:
      'Add the date you expect the materials to arrive and be ready for production',
    taskType: taskTypes.PRODUCTION,
    title: 'Purchase raw materials for production'
  },
  {
    description:
      'Make sure you account for all fabric, trims, labels, and packaging',
    taskType: taskTypes.PRODUCTION,
    title: 'Confirm receipt of all production materials'
  },
  {
    description:
      'Barcode stickers should be placed on outside of final packaging once products are complete',
    taskType: taskTypes.PRODUCTION,
    title: 'Print barcode stickers'
  },
  {
    description:
      'Set the due date of this task for when production will be done',
    taskType: taskTypes.PRODUCTION,
    title: 'Determine production completetion date'
  },
  {
    description:
      "This is where we'll send your completed order if you're not using our fulfillment service",
    taskType: taskTypes.DESIGN,
    title: 'Confirm final delivery address'
  },
  {
    description: 'HTS codes, quantities, cost. ',
    taskType: taskTypes.CALA,
    title: 'Generate commecial invoice'
  },
  {
    description: 'Style names, SKUs, barcodes, quantity per cartons',
    taskType: taskTypes.CALA,
    title: 'Generate production packing list'
  }
];

export const production: TaskTemplate[] = [
  {
    description: "Confirm that you've completed the quality report",
    taskType: taskTypes.PRODUCTION,
    title: 'Submit quality report'
  },
  {
    description: 'Make sure everything is ready for shipment',
    taskType: taskTypes.CALA,
    title: 'Complete QA inspection'
  },
  {
    description:
      'Confirm that garment is properly inspected and meets quality criteria',
    taskType: taskTypes.PRODUCTION,
    title: 'Final inspection'
  },
  {
    description:
      'All shipped units must match the quantities confirmed for production',
    taskType: taskTypes.PRODUCTION,
    title: 'Confirm packing list'
  },
  {
    description: 'Put garment in garment bags and place barcode stickers',
    taskType: taskTypes.PRODUCTION,
    title: 'Complete product packing'
  },
  {
    description: 'Confirm that barcode stickers are properly placed',
    taskType: taskTypes.PRODUCTION,
    title: 'Barcode stickers applied'
  },
  {
    description:
      'Let us know when the shipment is ready. Give at least 72 hours notice.',
    taskType: taskTypes.PRODUCTION,
    title: 'Notify CALA when shipment is ready'
  },
  {
    description: 'Send forwarder the commercial invoice and packing list',
    taskType: taskTypes.CALA,
    title: 'Notify freight forwarder'
  },
  {
    description: 'Tell us your estimated delivery date',
    taskType: taskTypes.PRODUCTION,
    title: 'Confirm goods have been shipped'
  },
  {
    description: 'Let us know that you received your order',
    taskType: taskTypes.DESIGN,
    title: 'Confirm receipt of products'
  }
];

export const fulfillment: TaskTemplate[] = [
  {
    description: 'Create Bill of Lading',
    taskType: taskTypes.CALA,
    title: 'BOL generated'
  },
  {
    description: 'Confirm that Bill of Lading was sent to fulfillment',
    taskType: taskTypes.CALA,
    title: 'BOL uploaded to fulfillment partner'
  },
  {
    description: 'Let us know that you received your order',
    taskType: taskTypes.CALA,
    title: 'Confirm products received'
  },
  {
    description:
      'Let us know that everything is ready for consumers to purchase.',
    taskType: taskTypes.CALA,
    title: 'Confirm inventory is online and ready'
  }
];
