import { Role } from "../users/types";
import Asset, { AssetLinks } from "../assets/types";

export interface BaseComment {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
  text: string;
  parentCommentId: string | null;
  userId: string;
  isPinned: boolean;
}

export default interface Comment extends BaseComment {
  userName: string | null;
  userEmail: string | null;
  userRole: Role;
  attachments: Asset[];
}

export interface BaseCommentRow {
  id: string;
  created_at: Date;
  deleted_at: Date | null;
  text: string;
  parent_comment_id: string | null;
  user_id: string;
  is_pinned: boolean;
}

export interface CommentRow extends BaseCommentRow {
  user_name: string | null;
  user_email: string | null;
  user_role: Role;
  attachments: Asset[];
}

export interface CommentWithMentions extends Comment {
  mentions: {
    [id: string]: string;
  };
}
export interface CommentWithResources extends CommentWithMentions {
  attachments: (Asset & Partial<AssetLinks>)[];
}
