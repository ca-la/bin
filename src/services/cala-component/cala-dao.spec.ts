import Knex from "knex";
import uuid from "node-uuid";
import { omit } from "lodash";

import { buildDao } from "./cala-dao";
import { buildAdapter } from "./cala-adapter";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PubSub from "../../services/pubsub/emitter";
import db from "../../services/db";

interface BaseWidget {
  id: string;
  createdAt: Date;
  title: string;
  partId: string;
}

interface BaseWidgetRow {
  id: string;
  created_at: Date;
  title: string;
  part_id: string;
}

interface PartRow {
  id: string;
  created_at: Date;
  title: string;
}

interface Widget extends BaseWidget {
  partTitle: string;
}

interface WidgetRow extends BaseWidgetRow {
  part_title: string;
}

const domain = "Widget" as "Widget";
const tableName = "test_table_widgets";

const p1: PartRow = {
  id: uuid.v4(),
  created_at: new Date(),
  title: "Part 1",
};
const w1: BaseWidgetRow = {
  id: uuid.v4(),
  created_at: new Date(),
  title: "Widget",
  part_id: p1.id,
};
const widget1: Widget = {
  id: w1.id,
  createdAt: w1.created_at,
  title: w1.title,
  partId: p1.id,
  partTitle: p1.title,
};

const p2: PartRow = {
  id: uuid.v4(),
  created_at: new Date(),
  title: "Part 2",
};
const w2: BaseWidgetRow = {
  id: uuid.v4(),
  created_at: new Date(),
  title: "Widget",
  part_id: p2.id,
};
const widget2: Widget = {
  id: w2.id,
  createdAt: w2.created_at,
  title: w2.title,
  partId: p2.id,
  partTitle: p2.title,
};

const p3: PartRow = {
  id: uuid.v4(),
  created_at: new Date(),
  title: "Part 3",
};
const w3: BaseWidgetRow = {
  id: uuid.v4(),
  created_at: new Date(),
  title: "Other Widget",
  part_id: p3.id,
};
const widget3: Widget = {
  id: w3.id,
  createdAt: w3.created_at,
  title: w3.title,
  partId: p3.id,
  partTitle: p3.title,
};

async function setup(): Promise<void> {
  await db.schema.dropTableIfExists(tableName);
  await db.schema.dropTableIfExists("test_table_widget_parts");
  await db.schema.createTable(
    "test_table_widget_parts",
    (table: Knex.CreateTableBuilder) => {
      table.uuid("id").primary();
      table.timestamp("created_at").notNullable().defaultTo(db.fn.now());
      table.text("title").notNullable();
    }
  );
  await db.schema.createTable(tableName, (table: Knex.CreateTableBuilder) => {
    table.uuid("id").primary();
    table.timestamp("created_at").notNullable().defaultTo(db.fn.now());
    table.text("title").notNullable();
    table
      .uuid("part_id")
      .references("test_table_widget_parts.id")
      .notNullable();
  });

  await db("test_table_widget_parts").insert([p1, p2, p3]);
  await db(tableName).insert([w1, w2, w3]);
}

async function tearDown(): Promise<void> {
  await db.schema.dropTable(tableName);
  await db.schema.dropTable("test_table_widget_parts");
}

function addMeta(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .select({ partTitle: "test_table_widget_parts.title" })
    .join(
      "test_table_widget_parts",
      "test_table_widgets.part_id",
      "test_table_widget_parts.id"
    );
}

test(
  "standard cala-dao",
  async (t: Test) => {
    sandbox().useFakeTimers(new Date());
    const adapter = buildAdapter<Widget, WidgetRow>({
      domain,
      requiredProperties: ["id", "createdAt", "title", "partId"],
    });
    const dao = buildDao<Widget, WidgetRow>(domain, tableName, adapter, {
      orderColumn: "created_at",
      queryModifier: addMeta,
      excludeDeletedAt: false,
    });

    const emitStub = sandbox().stub(PubSub, "emit");
    const modifierStub = sandbox().stub();

    const describeFind = async (): Promise<void> => {
      interface TestCase {
        title: string;
        filter: Partial<Widget>;
        result: Widget[];
        modifier?: (query: Knex.QueryBuilder) => Knex.QueryBuilder;
      }
      const testCases: TestCase[] = [
        {
          title: "Empty filter",
          filter: {},
          result: [widget1, widget2, widget3],
        },
        {
          title: "One",
          filter: { title: "Other Widget" },
          result: [widget3],
        },
        {
          title: "Some by companyName",
          filter: { title: "Widget" },
          result: [widget1, widget2],
        },
        {
          title: "Empty result",
          filter: { title: "Don't find me" },
          result: [],
        },
        {
          title: "Apply modifier",
          filter: { title: "Widget" },
          modifier: (query: Knex.QueryBuilder): Knex.QueryBuilder =>
            query.modify(modifierStub).offset(1).limit(1),
          result: [widget2],
        },
        {
          title: "Apply modifier (sort)",
          filter: { title: "Widget" },
          modifier: (query: Knex.QueryBuilder): Knex.QueryBuilder =>
            query
              .modify(modifierStub)
              .clearOrder()
              .orderBy("test_table_widget_parts.title", "DESC"),
          result: [widget2, widget1],
        },
      ];
      for (const testCase of testCases) {
        const trx = await db.transaction();
        try {
          const result = await (testCase.modifier
            ? dao.find(trx, testCase.filter, testCase.modifier)
            : dao.find(trx, testCase.filter));
          t.deepEqual(result, testCase.result, `find / ${testCase.title}`);
          t.deepEqual(
            emitStub.args,
            [],
            `find / ${testCase.title}, no emit() called`
          );
          t.equal(
            modifierStub.called,
            Boolean(testCase.modifier),
            `find / ${testCase.title}, calls modifier`
          );
        } finally {
          await trx.rollback();
          emitStub.resetHistory();
          modifierStub.resetHistory();
        }
      }
    };
    await describeFind();

    const describeFindOne = async (): Promise<void> => {
      interface TestCase {
        title: string;
        filter: Partial<Widget>;
        result: Widget | null;
        modifier?: (query: Knex.QueryBuilder) => Knex.QueryBuilder;
      }
      const testCases: TestCase[] = [
        {
          title: "Empty filter",
          filter: {},
          result: widget1,
        },
        {
          title: "Single match",
          filter: { title: "Other Widget" },
          result: widget3,
        },
        {
          title: "Multiple match",
          filter: { title: "Widget" },
          result: widget1,
        },
        {
          title: "Zero match",
          filter: { title: "Not found" },
          result: null,
        },
        {
          title: "Apply modifier (sort)",
          filter: { title: "Widget" },
          modifier: (query: Knex.QueryBuilder): Knex.QueryBuilder =>
            query
              .modify(modifierStub)
              .clearOrder()
              .orderBy("test_table_widget_parts.title", "DESC"),
          result: widget2,
        },
      ];
      for (const testCase of testCases) {
        const trx = await db.transaction();
        try {
          const result = await (testCase.modifier
            ? dao.findOne(trx, testCase.filter, testCase.modifier)
            : dao.findOne(trx, testCase.filter));
          t.deepEqual(result, testCase.result, `findOne / ${testCase.title}`);
          t.deepEqual(
            emitStub.args,
            [],
            `findOne / ${testCase.title}, no emit() called`
          );
          t.equal(
            modifierStub.called,
            Boolean(testCase.modifier),
            `find / ${testCase.title}, calls modifier`
          );
        } finally {
          await trx.rollback();
          emitStub.resetHistory();
          modifierStub.resetHistory();
        }
      }
    };
    await describeFindOne();

    const describeFindById = async (): Promise<void> => {
      interface TestCase {
        title: string;
        id: string;
        result: Widget | null;
      }
      const testCases: TestCase[] = [
        {
          title: "Existing id",
          id: widget1.id,
          result: widget1,
        },
        {
          title: "Non-existing id",
          id: uuid.v4(),
          result: null,
        },
      ];
      for (const testCase of testCases) {
        const trx = await db.transaction();
        try {
          const result = await dao
            .findById(trx, testCase.id)
            .catch(trx.rollback);
          t.deepEqual(result, testCase.result, `findById / ${testCase.title}`);
          t.deepEqual(
            emitStub.args,
            [],
            `findById / ${testCase.title}, no emit() called`
          );
        } finally {
          await trx.rollback();
          emitStub.resetHistory();
        }
      }
    };
    await describeFindById();

    const describeCreate = async (): Promise<void> => {
      const trx = await db.transaction();
      const widget4 = {
        ...widget1,
        id: uuid.v4(),
      };
      try {
        const result = await dao.create(trx, omit(widget4, "partTitle"));

        t.deepEqual(
          omit(result, ["createdAt"]),
          omit(widget4, ["createdAt", "partTitle"]),
          `create / returned result`
        );

        const found = await dao.findById(trx, widget4.id);
        t.deepEqual(
          omit(found, "createdAt"),
          omit(widget4, "createdAt"),
          `create / found result`
        );

        t.deepEqual(
          emitStub.args,
          [[{ type: "dao.created", domain: "Widget", created: result, trx }]],
          `create / no emit() called`
        );
      } finally {
        await trx.rollback();
        emitStub.resetHistory();
      }
    };
    await describeCreate();

    const describeCreateAll = async (): Promise<void> => {
      const trx = await db.transaction();
      const widget4 = {
        ...widget1,
        id: uuid.v4(),
        title: "New Widget Type",
      };
      const widget5 = {
        ...widget2,
        id: uuid.v4(),
        title: "New Widget Type",
      };
      try {
        const result = await dao
          .createAll(trx, [
            omit(widget4, "partTitle"),
            omit(widget5, "partTitle"),
          ])
          .catch(trx.rollback);

        t.deepEqual(
          result.map((item: Widget) => omit(item, "createdAt")),
          [widget4, widget5].map((item: Widget) =>
            omit(item, ["createdAt", "partTitle"])
          ),
          `createAll / returned result`
        );

        const found = await dao
          .find(trx, { title: "New Widget Type" })
          .catch(trx.rollback);
        t.deepEqual(
          found.map((item: Widget) => omit(item, "createdAt")),
          [widget4, widget5].map((item: Widget) => omit(item, "createdAt")),
          `createAll / returned result`
        );

        t.deepEqual(
          emitStub.args,
          [
            [
              {
                type: "dao.created",
                domain: "Widget",
                created: result[0],
                trx,
              },
            ],
            [
              {
                type: "dao.created",
                domain: "Widget",
                created: result[1],
                trx,
              },
            ],
          ],
          `createAll / no emit() called`
        );
      } finally {
        await trx.rollback();
        emitStub.resetHistory();
      }
    };
    await describeCreateAll();

    const describeUpdate = async (): Promise<void> => {
      interface TestCase {
        title: string;
        id: string;
        patch: Partial<Widget>;
        errorMessage?: string;
        before?: Widget;
        updateResult?: BaseWidget;
        findResult?: Widget;
        emitCalls: any[][];
      }
      const wrongId = uuid.v4();
      const testCases: TestCase[] = [
        {
          title: "Simple",
          id: widget1.id,
          patch: { title: "Renamed" },
          before: widget1,
          updateResult: { ...omit(widget1, "partTitle"), title: "Renamed" },
          findResult: { ...widget1, title: "Renamed" },
          emitCalls: [
            [
              {
                type: "dao.updating",
                domain: "Widget",
                before: widget1,
                patch: { title: "Renamed" },
              },
            ],
            [
              {
                type: "dao.updated",
                domain: "Widget",
                before: widget1,
                updated: { ...omit(widget1, "partTitle"), title: "Renamed" },
              },
            ],
          ],
        },
        {
          title: "Not found",
          id: wrongId,
          patch: { title: "Renamed" },
          errorMessage: `Could not find ${tableName} #${wrongId}`,
          emitCalls: [],
        },
        {
          title: "Patch with id",
          id: widget1.id,
          patch: { title: "Renamed", id: wrongId },
          errorMessage: `Patch should not contain id!`,
          emitCalls: [],
        },
      ];

      for (const testCase of testCases) {
        const trx = await db.transaction();
        try {
          if (testCase.errorMessage) {
            try {
              await dao.update(trx, testCase.id, testCase.patch);
              t.fail(
                `update / ${testCase.title} / didn't throw expected error`
              );
            } catch (err) {
              t.is(
                err.message,
                testCase.errorMessage,
                `update / ${testCase.title} / throws expected error`
              );
            }
          } else {
            const resultReturned = await dao
              .update(trx, testCase.id, testCase.patch)
              .catch(trx.rollback);

            t.deepEqual(
              resultReturned,
              { before: testCase.before, updated: testCase.updateResult },
              `update / ${testCase.title} / returned result`
            );

            const resultFound = await dao
              .findById(trx, testCase.id)
              .catch(trx.rollback);
            t.deepEqual(
              resultFound,
              testCase.findResult,
              `update / ${testCase.title} / found result`
            );
          }
          testCase.emitCalls.forEach((call: any[]) => {
            call[0].trx = trx;
          });
          t.deepEqual(
            emitStub.args,
            testCase.emitCalls,
            `update / ${testCase.title} / proper emit calls`
          );
          emitStub.resetHistory();
        } finally {
          await trx.rollback();
        }
      }
    };
    await describeUpdate();

    const describeCount = async (): Promise<void> => {
      interface TestCase {
        title: string;
        filter: Partial<Widget>;
        result: number;
      }
      const testCases: TestCase[] = [
        {
          title: "Empty filter",
          filter: {},
          result: 3,
        },
        {
          title: "One",
          filter: { title: "Other Widget" },
          result: 1,
        },
        {
          title: "Some by companyName",
          filter: { title: "Widget" },
          result: 2,
        },
        {
          title: "Empty result",
          filter: { title: "Don't find me" },
          result: 0,
        },
      ];
      for (const testCase of testCases) {
        const trx = await db.transaction();
        try {
          const result = await dao.count(trx, testCase.filter);
          t.deepEqual(result, testCase.result, `count / ${testCase.title}`);
          t.deepEqual(
            emitStub.args,
            [],
            `count / ${testCase.title}, no emit() called`
          );
        } finally {
          await trx.rollback();
          emitStub.resetHistory();
          modifierStub.resetHistory();
        }
      }
    };
    await describeCount();
  },
  setup,
  tearDown
);
