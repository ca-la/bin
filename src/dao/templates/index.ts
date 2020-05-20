import uuid from "node-uuid";

import db from "../../services/db";
import Template, {
  dataAdapter,
  isTemplateRow,
  TemplateRow,
} from "../../domain-objects/template";
import first from "../../services/first";
import { validate, validateEvery } from "../../services/validate-from-db";

const TABLE_NAME = "templates";

export async function create(data: Unsaved<Template>): Promise<Template> {
  const rowData = dataAdapter.forInsertion({ ...data, id: uuid.v4() });
  const created = await db(TABLE_NAME)
    .insert(rowData, "*")
    .then((rows: TemplateRow[]) => first<TemplateRow>(rows));

  if (!created) {
    throw new Error("Failed to create rows");
  }

  const parsed = validate<TemplateRow, Template>(
    TABLE_NAME,
    isTemplateRow,
    dataAdapter,
    created
  );

  return parsed;
}

export async function findAll(): Promise<Template[]> {
  const templates = await db(TABLE_NAME).select("*");

  const parsed = validateEvery<TemplateRow, Template>(
    TABLE_NAME,
    isTemplateRow,
    dataAdapter,
    templates
  );

  return parsed;
}
