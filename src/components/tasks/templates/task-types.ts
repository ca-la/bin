import { CollaboratorRole } from '../../collaborators/domain-objects/role';

export interface TaskType {
  id: string;
  title: string;
  assigneeRole: CollaboratorRole;
}

export const taskTypes: { [key: string]: TaskType } = {
  CALA: {
    id: '065f32d9-7d25-49f8-b25d-970e148b59d8',
    title: 'CALA',
    assigneeRole: CollaboratorRole.CALA
  },
  DESIGN: {
    id: '8635e5f1-6cec-4984-991b-af664d1d51ca',
    title: 'Design',
    assigneeRole: CollaboratorRole.DESIGNER
  },
  TECHNICAL_DESIGN: {
    id: 'e0dcffd3-9352-47d8-85a2-851cfb6ac437',
    title: 'Technical Design',
    assigneeRole: CollaboratorRole.PARTNER
  },
  PRODUCTION: {
    id: '31c52ddf-88be-4ed2-9f32-8279ae62fcab',
    title: 'Production',
    assigneeRole: CollaboratorRole.PARTNER
  },
  PRODUCT_PHOTOGRAPHY: {
    id: '9a188eba-b472-4b50-85ac-eb86319e642b',
    title: 'Product Photography',
    assigneeRole: CollaboratorRole.PARTNER
  }
};
