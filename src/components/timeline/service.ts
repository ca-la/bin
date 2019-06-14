import * as QuotesDAO from '../../dao/pricing-quotes';
import * as DesignsDAO from '../../dao/product-designs';
import { PricingQuote } from '../../domain-objects/pricing-quote';
import Timeline from './domain-object';
import { getTimeBuffer } from '../../services/add-time-buffer';
import ProductDesign = require('../../domain-objects/product-design');
import { findAllDesignsThroughCollaborator } from '../product-designs/dao';

function formatTimelines(
  quotes: PricingQuote[],
  designs: ProductDesign[]
): Timeline[] {
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

  return Object.keys(designQuotes).map((designId: string) => {
    const design = designQuotes[designId].design;
    const quote = designQuotes[designId].quote;

    if (!design) {
      throw new Error('Design not in list of designs!');
    }

    return {
      designId: quote.designId,
      design: {
        id: design.id,
        title: design.title,
        imageLinks: design.imageLinks || []
      },
      collections: design.collections,
      startDate: quote.createdAt,
      creationTimeMs: quote.creationTimeMs,
      specificationTimeMs: quote.specificationTimeMs,
      sourcingTimeMs: quote.sourcingTimeMs,
      samplingTimeMs: quote.samplingTimeMs,
      preProductionTimeMs: quote.preProductionTimeMs,
      productionTimeMs: quote.productionTimeMs + quote.processTimeMs,
      fulfillmentTimeMs: quote.fulfillmentTimeMs,
      bufferTimeMs: getTimeBuffer(quote)
    };
  });
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
