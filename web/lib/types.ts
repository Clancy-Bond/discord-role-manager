export interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount?: number;
}

export interface RoleInfo {
  id: string;
  name: string;
  color: string | null;
  colorInt: number;
  hoist: boolean;
  position: number;
  mentionable: boolean;
  managed: boolean;
  permissions: string; // bitfield string
  permissionNames: string[];
  createdAt: string;
}

export interface ChannelInfo {
  id: string;
  name: string;
  type: number;
  position: number;
  parentId: string | null;
  overwrites: ChannelOverwrite[];
}

export interface ChannelOverwrite {
  id: string;
  type: number; // 0 = role, 1 = member
  allow: string;
  deny: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  position: number;
  channels: ChannelInfo[];
}

export interface GroupedChannelsResponse {
  categories: CategoryGroup[];
  uncategorized: ChannelInfo[];
}

export interface DuplicateRequest {
  name?: string;
  count?: number;
  copyMembers?: boolean;
  channelIds?: string[];
}

export interface DuplicateResponse {
  created: { id: string; name: string; color: string | null }[];
  channelsCopied: number;
  membersCopied: number;
}

export interface CommandAction {
  type: "duplicate" | "delete" | "edit" | "bulk_assign" | "info" | "unknown";
  description: string;
  params: Record<string, unknown>;
  confidence: number;
}
