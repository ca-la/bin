export default interface Timeline {
  designId: string;
  design: { id: string; title: string };
  collections?: { id: string; title: string }[];
  startDate: Date;
  creationTimeMs: number;
  specificationTimeMs: number;
  sourcingTimeMs: number;
  samplingTimeMs: number;
  preProductionTimeMs: number;
  productionTimeMs: number;
  fulfillmentTimeMs: number;
  bufferTimeMs: number;
}
