import * as QuotesDAO from '../../dao/pricing-quotes';
import * as DesignsDAO from '../../dao/product-designs';
import * as TaskEventsDAO from '../../dao/task-events';
import { PricingQuote } from '../../domain-objects/pricing-quote';
import Timeline from './domain-object';
import { getTimeBuffer } from '../../services/add-time-buffer';
import ProductDesign = require('../../domain-objects/product-design');
import { DetailsTask, TaskStatus } from '../../domain-objects/task-event';
import { findAllDesignsThroughCollaborator } from '../product-designs/dao';

interface StageBreakdown {
  title: string;
  startedAt: Date | null;
  completedAt: Date | null;
  totalTasks: number;
  completedTasks: number;
  ordering: number;
  time: number;
}

function isTaskMostRecentCompletedTask(
  task: DetailsTask & { designStageId: string },
  finalTask: { [id: string]: Date }
): boolean {
  return Boolean(
    finalTask[task.designStageId] &&
      task.status === TaskStatus.COMPLETED &&
      task.lastModifiedAt.getTime() > finalTask[task.designStageId].getTime()
  );
}

function isFinalCompletedTask(
  task: DetailsTask & { designStageId: string },
  finalTask: { [id: string]: Date }
): boolean {
  return Boolean(
    !finalTask[task.designStageId] && task.status === TaskStatus.COMPLETED
  );
}

function isTaskOldestCompletedTask(
  task: DetailsTask & { designStageId: string },
  finalTask: { [id: string]: Date }
): boolean {
  return Boolean(
    finalTask[task.designStageId] &&
      task.status === TaskStatus.COMPLETED &&
      task.lastModifiedAt.getTime() < finalTask[task.designStageId].getTime()
  );
}

function isFirstCompletedTask(
  task: DetailsTask & { designStageId: string },
  finalTask: { [id: string]: Date }
): boolean {
  return Boolean(
    !finalTask[task.designStageId] && task.status === TaskStatus.COMPLETED
  );
}

function hasDesignStageId(
  task: DetailsTask
): task is DetailsTask & { designStageId: string } {
  return task.designStageId ? true : false;
}

function addTaskToStageBreakdown(
  stages: { [id: string]: StageBreakdown },
  task: DetailsTask & { designStageId: string }
): void {
  const stage = stages[task.designStageId];
  stage.totalTasks = stage.totalTasks + 1;

  if (task.status === TaskStatus.COMPLETED) {
    stage.completedTasks = stage.completedTasks + 1;
  }
  if (task.ordering === 0 && task.status === TaskStatus.COMPLETED) {
    stage.startedAt = task.lastModifiedAt;
  }
}

function createStageBreakdown(
  stages: { [id: string]: StageBreakdown },
  task: DetailsTask & { designStageId: string }
): void {
  if (task.designStage.title && task.designStage.ordering !== null) {
    stages[task.designStageId] = {
      title: task.designStage.title,
      ordering: task.designStage.ordering,
      startedAt: null,
      completedAt: null,
      time: 0,
      totalTasks: 1,
      completedTasks: task.status === TaskStatus.COMPLETED ? 1 : 0
    };
  }
}

async function getStageBreakdownsByDesignId(
  designId: string
): Promise<StageBreakdown[]> {
  const tasksForDesign = await TaskEventsDAO.findByDesignId(designId);
  const stages: { [id: string]: StageBreakdown } = {};
  const finalTask: { [id: string]: Date } = {};
  const firstTask: { [id: string]: Date } = {};

  for (const task of tasksForDesign) {
    if (hasDesignStageId(task)) {
      if (
        isTaskMostRecentCompletedTask(task, finalTask) ||
        isFinalCompletedTask(task, finalTask)
      ) {
        finalTask[task.designStageId] = task.lastModifiedAt;
      }
      if (
        isTaskOldestCompletedTask(task, firstTask) ||
        isFirstCompletedTask(task, firstTask)
      ) {
        firstTask[task.designStageId] = task.lastModifiedAt;
      }
      if (stages[task.designStageId]) {
        addTaskToStageBreakdown(stages, task);
      } else if (task.designStage.title && task.designStage.ordering !== null) {
        createStageBreakdown(stages, task);
      }
    }
  }
  for (const key of Object.keys(stages)) {
    const stage = stages[key];
    if (stage.totalTasks === stage.completedTasks) {
      stage.completedAt = finalTask[key] || null;
    }
    if (firstTask[key]) {
      stage.startedAt = firstTask[key] || null;
    }
  }

  return Object.values(stages);
}

function getStageTime(stage: StageBreakdown, quote: PricingQuote): number {
  switch (stage.title) {
    case 'Creation': {
      return quote.creationTimeMs;
    }
    case 'Specification': {
      return quote.specificationTimeMs;
    }
    case 'Sourcing': {
      return quote.sourcingTimeMs;
    }
    case 'Sampling': {
      return quote.samplingTimeMs;
    }
    case 'Pre-Production': {
      return quote.preProductionTimeMs;
    }
    case 'Production': {
      return (
        quote.productionTimeMs + quote.processTimeMs + quote.fulfillmentTimeMs
      );
    }
    default: {
      throw new Error(
        `Could not parse stage time! Stage title: ${stage.title}`
      );
    }
  }
}

async function formatTimelines(
  quotes: PricingQuote[],
  designs: ProductDesign[]
): Promise<Timeline[]> {
  const designQuotes: {
    [designId: string]: {
      design?: ProductDesign;
      quote: PricingQuote & { designId: string };
    };
  } = {};
  const filteredQuotes = quotes.filter(
    (quote: PricingQuote): quote is PricingQuote & { designId: string } =>
      quote.designId !== null
  );
  for (const quote of filteredQuotes) {
    designQuotes[quote.designId] = { quote };
  }
  for (const design of designs) {
    if (designQuotes[design.id]) {
      designQuotes[design.id].design = design;
    }
  }

  const timelines = [];
  function notNull(val: StageBreakdown | null): val is StageBreakdown {
    return val !== null;
  }

  for (const designId of Object.keys(designQuotes)) {
    const design = designQuotes[designId].design;
    const quote = designQuotes[designId].quote;

    if (!design) {
      throw new Error('Design not in list of designs!');
    }
    const stageBreakdowns = await getStageBreakdownsByDesignId(designId);
    const stageOrNulls: (StageBreakdown | null)[] = stageBreakdowns.map(
      (stage: StageBreakdown) => {
        try {
          return { ...stage, time: getStageTime(stage, quote) };
        } catch (e) {
          return null;
        }
      }
    );
    const stages: StageBreakdown[] = stageOrNulls.filter(notNull);

    timelines.push({
      designId: quote.designId,
      design: {
        id: design.id,
        title: design.title,
        imageLinks: design.imageLinks || []
      },
      collections: design.collections,
      startDate: quote.createdAt,
      stages,
      creationTimeMs: quote.creationTimeMs,
      specificationTimeMs: quote.specificationTimeMs,
      sourcingTimeMs: quote.sourcingTimeMs,
      samplingTimeMs: quote.samplingTimeMs,
      preProductionTimeMs: quote.preProductionTimeMs,
      productionTimeMs:
        quote.productionTimeMs + quote.processTimeMs + quote.fulfillmentTimeMs,
      bufferTimeMs: getTimeBuffer(quote)
    });
  }

  return timelines;
}

export async function findAllByCollectionId(
  collectionId: string
): Promise<Timeline[]> {
  const designs = await DesignsDAO.findByCollectionId(collectionId);
  const designIds = designs.map((design: ProductDesign): string => design.id);
  const initialEstimates:
    | PricingQuote[]
    | null = await QuotesDAO.findByDesignIds(designIds);

  if (!initialEstimates) {
    return [];
  }

  return formatTimelines(initialEstimates, designs);
}

export async function findAllByUserId(
  userId: string,
  limit?: number,
  offset?: number
): Promise<Timeline[]> {
  const designs = await findAllDesignsThroughCollaborator(
    userId,
    limit,
    offset
  );
  const designIds = designs.map((design: ProductDesign): string => design.id);
  const initialEstimates:
    | PricingQuote[]
    | null = await QuotesDAO.findByDesignIds(designIds);

  if (!initialEstimates) {
    return [];
  }

  return formatTimelines(initialEstimates, designs);
}
