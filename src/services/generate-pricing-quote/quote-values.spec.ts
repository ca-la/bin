import db from "../db";
import { pick } from "lodash";
import { test, Test } from "../../test-helpers/fresh";
import {
  DeepEqualSet,
  basicValuePoolQuery,
  QuoteValueFilterBase,
  getProcessTimelinePoolQuery,
  getProcessTimelinePool,
  ProcessTimeLinePoolFilter,
  findQuoteItemFromPool,
} from "./quote-values";
import { MaterialCategory } from "../../domain-objects/pricing";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import PricingProcessTimeline from "../../components/pricing-process-timeline/domain-object";

test("DeepEqualSet", async (t: Test) => {
  type MaterialFilterType = QuoteValueFilterBase & {
    category: MaterialCategory;
  };
  const materialFilter = new DeepEqualSet<MaterialFilterType>();

  const items: MaterialFilterType[] = [
    {
      version: 1,
      units: 10,
      category: MaterialCategory.BASIC,
    },
    {
      version: 1,
      units: 10,
      category: MaterialCategory.STANDARD,
    },
    {
      version: 4,
      units: 10,
      category: MaterialCategory.STANDARD,
    },
    {
      version: 4,
      units: 11,
      category: MaterialCategory.STANDARD,
    },
  ];
  for (const item of items) {
    materialFilter.addItem(item);
  }
  materialFilter.addItem({ ...items[2] });
  materialFilter.addItem({ ...items[1] });
  materialFilter.addItem(items[2]);
  materialFilter.addItem(items[1]);
  t.deepEqual(materialFilter.toArray(), items, "doesn't duplicate");
});

test("basicValuePoolQuery", async (t: Test) => {
  const TABLE_NAME = "some_pricing_value_table";
  type MaterialFilterType = QuoteValueFilterBase & {
    category: MaterialCategory;
  };

  interface TestCase {
    title: string;
    filters: MaterialFilterType[];
    sql: string;
  }

  const testCases: TestCase[] = [
    {
      title: "Regular case",
      filters: [
        {
          version: 1,
          units: 10,
          category: MaterialCategory.BASIC,
        },
        {
          version: 1,
          units: 7,
          category: MaterialCategory.STANDARD,
        },
      ],
      sql: `select * from "${TABLE_NAME}" where minimum_units <= 10
        and (version=1 AND category='BASIC'
        OR version=1 AND category='STANDARD') order by "minimum_units" desc`,
    },
    {
      title: "Empty filter case",
      filters: [],
      sql: `select * from "${TABLE_NAME}" order by "minimum_units" desc`,
    },
  ];

  for (const testCase of testCases) {
    const q = basicValuePoolQuery(db, TABLE_NAME, testCase.filters);
    t.equals(
      q.toQuery().toLowerCase(),
      testCase.sql
        .replace(/[\s]+/g, " ")
        .replace("\n", "")
        .replace("\r", "")
        .toLowerCase(),
      "builds correct query"
    );
  }
});

test("getProcessTimelinePoolQuery", async (t: Test) => {
  const TABLE_NAME = "pricing_process_timelines";
  interface TestCase {
    title: string;
    filters: ProcessTimeLinePoolFilter[];
    sql: string;
  }

  const testCases: TestCase[] = [
    {
      title: "Regular case",
      filters: [
        {
          version: 0,
          units: 10,
          unique_processes: 0,
        },
        {
          version: 1,
          units: 7,
          unique_processes: 2,
        },
        {
          version: 1,
          units: 1,
          unique_processes: 1,
        },
      ],
      sql: `select * from "${TABLE_NAME}" where
        "version" in (0, 1)
        and minimum_units <= 10
        and unique_processes <= 2
        order by "minimum_units" desc, "unique_processes" desc`,
    },
    {
      title: "Empty filter case",
      filters: [],
      sql: `select * from "${TABLE_NAME}" order by "minimum_units" desc, "unique_processes" desc`,
    },
  ];

  for (const testCase of testCases) {
    const q = getProcessTimelinePoolQuery(db, testCase.filters);
    t.equals(
      q.toQuery().toLowerCase(),
      testCase.sql
        .replace(/[\s]+/g, " ")
        .replace("\n", "")
        .replace("\r", "")
        .toLowerCase(),
      "builds correct query"
    );
  }
});

test("getProcessTimelinePool", async (t: Test) => {
  await generatePricingValues();

  const filters: ProcessTimeLinePoolFilter[] = [
    {
      version: 0,
      units: 10,
      unique_processes: 0,
    },
    {
      version: 0,
      units: 7,
      unique_processes: 2,
    },
    {
      version: 0,
      units: 1,
      unique_processes: 1,
    },
  ];
  const timelines = await getProcessTimelinePool(db, filters);
  const comparableValues = timelines.map((item: PricingProcessTimeline) =>
    pick(item, "minimumUnits", "uniqueProcesses", "version")
  );

  t.deepEqual(
    comparableValues,
    [
      { version: 0, minimumUnits: 5, uniqueProcesses: 2 },
      { version: 0, minimumUnits: 5, uniqueProcesses: 1 },
      { version: 0, minimumUnits: 5, uniqueProcesses: 0 },
      { version: 0, minimumUnits: 1, uniqueProcesses: 2 },
      { version: 0, minimumUnits: 1, uniqueProcesses: 1 },
      { version: 0, minimumUnits: 1, uniqueProcesses: 0 },
    ],
    "takes filtered values from pricing_process_timelines, sorted properly"
  );
});

test("findQuoteItemFromPool", async (t: Test) => {
  interface MaterialItemType {
    id: number;
    minimumUnits: number;
    version: number;
    category: MaterialCategory;
  }

  interface TestCase {
    title: string;
    minimumUnits: number;
    filter: Partial<MaterialItemType>;
    list: MaterialItemType[];
    result: number | null;
  }

  const testCases: TestCase[] = [
    {
      title: "Simplest case",
      minimumUnits: 5,
      filter: { category: MaterialCategory.BASIC, version: 1 },
      list: [
        {
          category: MaterialCategory.BASIC,
          version: 1,
          minimumUnits: 2,
          id: 1,
        },
        {
          category: MaterialCategory.BASIC,
          version: 1,
          minimumUnits: 1,
          id: 2,
        },
      ],
      result: 1,
    },
    {
      title: "Not found",
      minimumUnits: 5,
      filter: { category: MaterialCategory.BASIC, version: 2 },
      list: [
        {
          category: MaterialCategory.BASIC,
          version: 1,
          minimumUnits: 2,
          id: 1,
        },
        {
          category: MaterialCategory.BASIC,
          version: 1,
          minimumUnits: 1,
          id: 2,
        },
      ],
      result: null,
    },
    {
      title: "Big pool case",
      minimumUnits: 5,
      filter: { category: MaterialCategory.LUXE, version: 2 },
      list: [
        {
          category: MaterialCategory.LUXE,
          version: 2,
          minimumUnits: 10,
          id: 1,
        },
        { category: MaterialCategory.LUXE, version: 1, minimumUnits: 1, id: 2 },
        {
          category: MaterialCategory.BASIC,
          version: 2,
          minimumUnits: 4,
          id: 3,
        },
        {
          category: MaterialCategory.LUXE,
          version: 2,
          minimumUnits: 10,
          id: 4,
        },
        { category: MaterialCategory.LUXE, version: 2, minimumUnits: 4, id: 5 },
        { category: MaterialCategory.LUXE, version: 2, minimumUnits: 3, id: 6 },
      ],
      result: 5,
    },
  ];
  for (const testCase of testCases) {
    try {
      const result = findQuoteItemFromPool(
        testCase.minimumUnits,
        testCase.filter,
        testCase.list
      );
      if (testCase.result === null) {
        t.fail(`TestCase "${testCase.title}" expected to throw`);
      } else {
        t.equals(result.id, testCase.result, testCase.title);
      }
    } catch (err) {
      if (testCase.result === null) {
        t.ok(err);
      } else {
        throw err;
      }
    }
  }
});
