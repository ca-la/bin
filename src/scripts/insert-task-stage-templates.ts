import Knex from "knex";
import process from "process";
import uuid from "node-uuid";

import db from "../services/db";
import { log } from "../services/logger";
import { green, red, reset, yellow } from "../services/colors";

import StageTemplate, {
  dataAdapter as stageDataAdapter,
} from "../domain-objects/stage-template";
import TaskTemplate, {
  dataAdapter as taskDataAdapter,
} from "../domain-objects/task-template";

/*tslint:disable:max-line-length*/
const stages: StageTemplate[] = [
  {
    description:
      "Creation is the first phase of every project. Add as much detail as you can in the form of references, sketches, annotations, and measurements about your design, materials, and artwork.",
    id: uuid.v4(),
    ordering: 0,
    title: "Creation",
  },
  {
    description:
      "The Specification phase is where things get technical. During this phase you finalize the technical details–measurements, materials, and process–of your design.",
    id: uuid.v4(),
    ordering: 1,
    title: "Specification",
  },
  {
    description:
      "Sourcing is where things start to get fun. Partners will ship you physical material options for approval based on your material, and artwork specifications.",
    id: uuid.v4(),
    ordering: 2,
    title: "Sourcing",
  },
  {
    description:
      "The Sampling phase is where your design comes to life. Partners take all your specifications and approvals from previous phases and turn it into a physical sample for you to approve.",
    id: uuid.v4(),
    ordering: 3,
    title: "Sampling",
  },
  {
    description:
      "Pre-production comes after final approval of the sample. This preparation phase ensures production is smooth and without delay.",
    id: uuid.v4(),
    ordering: 4,
    title: "Pre-Production",
  },
  {
    description:
      "The Production phase. During this phase your full order is produced, quality checked and prepared for shipment.",
    id: uuid.v4(),
    ordering: 5,
    title: "Production",
  },
  {
    description:
      "Fulfillment is the final phase. Your products are shipped either directly to you or to a fulfillment partner who will warehouse, pack and ship orders to your customers directly.",
    id: uuid.v4(),
    ordering: 6,
    title: "Fulfillment",
  },
];

const tasks: TaskTemplate[] = [
  {
    assigneeRole: "DESIGNER",
    description: "It's OK if this is a rough idea",
    designPhase: "POST_CREATION",
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[0].id,
    title: "Add your sketch",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Let us know what you're thinking for style, fit, fabric, and trim details",
    designPhase: "POST_CREATION",
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[0].id,
    title: "Add your reference images",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "If you have specific fabric & trim preferences, let us know (type, weight, content, color, print, or wash)",
    designPhase: "POST_CREATION",
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[0].id,
    title: "Add your materials",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Send over your references for fit, fabric, color, wash, etc. ",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[2].id,
    title: "Send your reference samples",
  },
  {
    assigneeRole: "PARTNER",
    description: "Let us know you recieved the samples for this design",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[2].id,
    title: "Confirm receipt of reference samples",
  },
  {
    assigneeRole: "CALA",
    description: "For reference materials",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[2].id,
    title: "Create shipping label",
  },
  {
    assigneeRole: "PARTNER",
    description: "Set the due date for when the pattern sample will be done",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[3].id,
    title: "Create pattern",
  },
  {
    assigneeRole: "PARTNER",
    description: "Set the due date for when the sample will be done",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[3].id,
    title: "Create sample",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Capture and upload the front, back, and details on dress form or mannequin",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[3].id,
    title: "Add photo of completed sample",
  },
  {
    assigneeRole: "CALA",
    description: "Make the shipping label for the sample",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[3].id,
    title: "Create shipping label",
  },
  {
    assigneeRole: "PARTNER",
    description: "Confirm the sample was sent",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 4,
    stageTemplateId: stages[3].id,
    title: "Send the sample",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Tell us how the sample fits. Request changes or approve this sample.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 5,
    stageTemplateId: stages[3].id,
    title: "Approve fit of your sample",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Are the materials what you were expecting? Request changes or approve this sample",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 6,
    stageTemplateId: stages[3].id,
    title: "Approve sample's materials",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Is the art placed correctly? Does anything look off? Request changes or approve this sample.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 7,
    stageTemplateId: stages[3].id,
    title: "Approve sample's artwork",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Make sure you understand all specifications and quantities required for production completion",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 9,
    stageTemplateId: stages[3].id,
    title: "Confirm final specs and quantities for production",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Tell us how much a fully packed product weighs, so we can calculate shipping",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[4].id,
    title: "Add final packaged product weight",
  },
  {
    assigneeRole: "PARTNER",
    description: "Tell us the per-item tax rate and code for each product",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[4].id,
    title: "Add import tax rate for garment",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Add images and annotate details of options for fabric, trim, processes and artwork",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 4,
    stageTemplateId: stages[2].id,
    title: "Add material options for designer review",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Tell us any specific measurements and placement for details, trims, or artwork.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[1].id,
    title: "Add your measurements",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Feel free to markup a sketch to help us understand your vision.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[1].id,
    title: "Add your annotations with construction details",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Give us your files for prints or patterns (SVG or AI preferred; but we can work with anything).",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[1].id,
    title: "Upload your artwork ",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Add a sketch or annotation detailing where you want your brand and/or care labels.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[1].id,
    title: "Add your label placement details",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Let us know how you want your customer to receive your product.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 4,
    stageTemplateId: stages[1].id,
    title: "Add your packaging details",
  },
  {
    assigneeRole: "DESIGNER",
    description: "This is where we will send your samples.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 5,
    stageTemplateId: stages[1].id,
    title: "Confirm your shipping address",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "After this approval, the design cannot change. Production will move forward and cannot be canceled.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 8,
    stageTemplateId: stages[3].id,
    title: "Final Sample Approval",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Review materials, processes, and artwork options and approve. If it looks good we'll send you a physical version.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 5,
    stageTemplateId: stages[2].id,
    title: "Review options and provide feedback",
  },
  {
    assigneeRole: "CALA",
    description: "For material options for the designer to review",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 6,
    stageTemplateId: stages[2].id,
    title: "Create shipping label",
  },
  {
    assigneeRole: "PARTNER",
    description: "Confirm that the designer's materials were shipped",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 7,
    stageTemplateId: stages[2].id,
    title: "Send material options to designer for review",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Create an 'Approve' task for each item the designer needs to approve",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 8,
    stageTemplateId: stages[2].id,
    title: "Create approval tasks for each sourced item",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "Be sure to review and approval all materials, processes, and artwork options for the sample",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 9,
    stageTemplateId: stages[2].id,
    title: "Complete all approvals",
  },
  {
    assigneeRole: "DESIGNER",
    description: "The default size is Medium",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 10,
    stageTemplateId: stages[2].id,
    title: "What size do you want your sample to be?",
  },
  {
    assigneeRole: "PARTNER",
    description: "Place order for all materials needed for the sample",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 11,
    stageTemplateId: stages[2].id,
    title: "Purchase materials for sample",
  },
  {
    assigneeRole: "CALA",
    description: "Make the shipping label for the return of reference items",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[4].id,
    title: "Create shipping label ",
  },
  {
    assigneeRole: "PARTNER",
    description: "Send back the Designer's reference items",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[4].id,
    title: "Return reference items",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Confirm that you've completed the grading process – if necessary",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 4,
    stageTemplateId: stages[4].id,
    title: "Grading complete",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Add the date you expect the materials to arrive and be ready for production",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 5,
    stageTemplateId: stages[4].id,
    title: "Purchase raw materials for production",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Make sure you account for all fabric, trims, labels, and packaging",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 6,
    stageTemplateId: stages[4].id,
    title: "Confirm receipt of all production materials",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Barcode stickers should be placed on outside of final packaging once products are complete",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 7,
    stageTemplateId: stages[4].id,
    title: "Print barcode stickers",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Set the due date of this task for when production will be done",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 8,
    stageTemplateId: stages[4].id,
    title: "Determine production completetion date",
  },
  {
    assigneeRole: "DESIGNER",
    description:
      "This is where we'll send your completed order if you're not using our fulfillment service",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 9,
    stageTemplateId: stages[4].id,
    title: "Confirm final delivery address",
  },
  {
    assigneeRole: "CALA",
    description: "HTS codes, quantities, cost. ",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 10,
    stageTemplateId: stages[4].id,
    title: "Generate commecial invoice",
  },
  {
    assigneeRole: "CALA",
    description: "Style names, SKUs, barcodes, quantity per cartons",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 11,
    stageTemplateId: stages[4].id,
    title: "Generate production packing list",
  },
  {
    assigneeRole: "PARTNER",
    description: "Confirm that you've completed the quality report",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[5].id,
    title: "Submit quality report",
  },
  {
    assigneeRole: "CALA",
    description: "Make sure everything is ready for shipment",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[5].id,
    title: "Complete QA inspection",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Confirm that garment is properly inspected and meets quality criteria",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[5].id,
    title: "Final inspection",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "All shipped units must match the quantities confirmed for production",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[5].id,
    title: "Confirm packing list",
  },
  {
    assigneeRole: "PARTNER",
    description: "Put garment in garment bags and place barcode stickers",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 4,
    stageTemplateId: stages[5].id,
    title: "Complete product packing",
  },
  {
    assigneeRole: "PARTNER",
    description: "Confirm that barcode stickers are properly placed",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 5,
    stageTemplateId: stages[5].id,
    title: "Barcode stickers applied",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Let us know when the shipment is ready. Give at least 72 hours notice.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 6,
    stageTemplateId: stages[5].id,
    title: "Notify CALA when shipment is ready",
  },
  {
    assigneeRole: "CALA",
    description: "Send forwarder the commercial invoice and packing list",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 7,
    stageTemplateId: stages[5].id,
    title: "Notify freight forwarder",
  },
  {
    assigneeRole: "PARTNER",
    description: "Tell us your estimated delivery date",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 8,
    stageTemplateId: stages[5].id,
    title: "Confirm goods have been shipped",
  },
  {
    assigneeRole: "DESIGNER",
    description: "Let us know that you received your order",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 9,
    stageTemplateId: stages[5].id,
    title: "Confirm receipt of products",
  },
  {
    assigneeRole: "CALA",
    description: "Create Bill of Lading ",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[6].id,
    title: "BOL generated",
  },
  {
    assigneeRole: "CALA",
    description: "Confirm that Bill of Lading was sent to fulfillment",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[6].id,
    title: "BOL uploaded to fulfillment partner",
  },
  {
    assigneeRole: "CALA",
    description: "Let us know that you received your order",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[6].id,
    title: "Confirm products received",
  },
  {
    assigneeRole: "CALA",
    description:
      "Let us know that everything is ready for consumers to purchase.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[6].id,
    title: "Confirm inventory is online and ready",
  },
  {
    assigneeRole: "PARTNER",
    description:
      "Review material specifications and submissions. Request further info if something is missing.",
    designPhase: "POST_APPROVAL",
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[2].id,
    title: "Review material specifications",
  },
];
/*tslint:enable:max-line-length*/

insertTaskAndStageTemplates()
  .then(() => {
    log(`${green}Successfully inserted!`);
    process.exit();
  })
  .catch((err: any): void => {
    log(`${red}ERROR:\n${reset}`, err);
    process.exit(1);
  });

async function insertTaskAndStageTemplates(): Promise<void> {
  const expectedCount = stages.length + tasks.length;

  return db.transaction(async (trx: Knex.Transaction) => {
    const stagesInserted = await trx
      .insert(stages.map(stageDataAdapter.forInsertion.bind(stageDataAdapter)))
      .into("stage_templates");
    const tasksInserted = await trx
      .insert(tasks.map(taskDataAdapter.forInsertion.bind(taskDataAdapter)))
      .into("task_templates");
    const rowCount = stagesInserted.rowCount + tasksInserted.rowCount;

    if (rowCount !== expectedCount) {
      return trx.rollback(`
${red}Not all rows were inserted!
${reset}Expected ${yellow}${expectedCount}${reset}, but got ${red}${rowCount}${reset}.

Dump of returned rows:

${JSON.stringify(stagesInserted, null, 4)}
${JSON.stringify(tasksInserted, null, 4)}
`);
    }
  });
}
