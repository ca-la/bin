import { ThumbnailAndPreviewLinks } from '../../services/attach-asset-links';

export default interface Timeline {
  designId: string;
  design: { id: string; title: string; imageLinks: ThumbnailAndPreviewLinks[] };
  collections?: { id: string; title: string }[];
  startDate: Date;
  stages: {
    id: string;
    title: string;
    time: number;
    startedAt: Date | null;
    completedAt: Date | null;
    ordering: number;
    totalTasks: number;
    completedTasks: number;
  }[];
  creationTimeMs: number;
  specificationTimeMs: number;
  sourcingTimeMs: number;
  samplingTimeMs: number;
  preProductionTimeMs: number;
  productionTimeMs: number;
  bufferTimeMs: number;
}
