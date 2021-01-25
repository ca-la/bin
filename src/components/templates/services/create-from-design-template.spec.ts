import Knex from "knex";
import db from "../../../services/db";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import * as DesignsDAO from "../designs/dao";
import * as DuplicateDesign from "../../../services/duplicate/templates/designs";
import * as DuplicatePreviewToolDesign from "../../../services/duplicate/designs";

import createFromDesignTemplate from "./create-from-design-template";
import { TemplateDesign } from "../designs/domain-object";
import { staticProductDesign } from "../../../test-helpers/factories/product-design";

const u1 = "106213e2-5b84-4613-a798-3ded1697a01c";
const d1 = "00bb187a-4a4c-4d75-8356-802b2fda6434";

test("createFromDesignTemplate() empty case", async (t: Test) => {
  const findStub = sandbox().stub(DesignsDAO, "findByDesignId").resolves(null);
  const duplicateSpy = sandbox().spy(DuplicateDesign, "default");

  await db.transaction(async (trx: Knex.Transaction) => {
    try {
      await createFromDesignTemplate(trx, {
        newCreatorId: u1,
        templateDesignId: d1,
        isPhidias: true,
      });
      t.fail("Should not get here.");
    } catch (error) {
      t.equal(
        error.message,
        'Template for design "00bb187a-4a4c-4d75-8356-802b2fda6434" does not exist.'
      );
    }
  });

  t.equal(findStub.callCount, 1);
  t.deepEqual(findStub.args[0][0], d1);
  t.equal(duplicateSpy.callCount, 0);
});

test("createFromDesignTemplate() non-empty case for phidias", async (t: Test) => {
  const d2 = "32cce3a1-928b-4634-985b-f3f08236ac56";
  const templateDesign1: TemplateDesign = {
    designId: d1,
    templateCategoryId: null,
  };
  const duplicatedDesign1 = staticProductDesign({
    id: d2,
  });

  const findStub = sandbox()
    .stub(DesignsDAO, "findByDesignId")
    .resolves(templateDesign1);
  const duplicateStub = sandbox()
    .stub(DuplicateDesign, "default")
    .resolves(duplicatedDesign1);

  const result = await db.transaction(async (trx: Knex.Transaction) => {
    return createFromDesignTemplate(trx, {
      newCreatorId: u1,
      templateDesignId: d1,
      isPhidias: true,
    });
  });

  t.deepEqual(
    result,
    duplicatedDesign1,
    "Returns the result from the duplication service."
  );

  t.equal(findStub.callCount, 1);
  t.deepEqual(findStub.args[0][0], d1);

  t.equal(duplicateStub.callCount, 1);
  t.equal(duplicateStub.args[0][1], d1);
  t.equal(duplicateStub.args[0][2], u1);
});

test("createFromDesignTemplate() non-empty case for preview tool", async (t: Test) => {
  const d2 = "32cce3a1-928b-4634-985b-f3f08236ac56";
  const templateDesign1: TemplateDesign = {
    designId: d1,
    templateCategoryId: null,
  };
  const duplicatedDesign1 = staticProductDesign({
    id: d2,
  });

  const findStub = sandbox()
    .stub(DesignsDAO, "findByDesignId")
    .resolves(templateDesign1);
  const duplicateStub = sandbox()
    .stub(DuplicatePreviewToolDesign, "findAndDuplicateDesign")
    .resolves(duplicatedDesign1);

  const result = await db.transaction(async (trx: Knex.Transaction) => {
    return createFromDesignTemplate(trx, {
      newCreatorId: u1,
      templateDesignId: d1,
    });
  });

  t.deepEqual(
    result,
    duplicatedDesign1,
    "Returns the result from the duplication service."
  );

  t.equal(findStub.callCount, 1);
  t.deepEqual(findStub.args[0][0], d1);

  t.equal(duplicateStub.callCount, 1);
  t.equal(duplicateStub.args[0][1], d1);
  t.equal(duplicateStub.args[0][2], u1);
});
