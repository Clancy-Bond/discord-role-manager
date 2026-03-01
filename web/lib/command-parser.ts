import type { CommandAction, RoleInfo, ChannelInfo } from "./types";

// Parse natural language commands into structured actions
// No LLM API needed - uses keyword matching + fuzzy role/channel name matching

export function parseCommand(
  input: string,
  roles: RoleInfo[],
  channels: ChannelInfo[]
): CommandAction {
  const lower = input.toLowerCase().trim();

  // ── Duplicate / Copy ──
  if (/\b(duplicate|copy|clone|replicate)\b/.test(lower)) {
    return parseDuplicate(lower, roles, channels);
  }

  // ── Delete / Remove ──
  if (/\b(delete|remove|destroy)\b/.test(lower)) {
    return parseDelete(lower, roles);
  }

  // ── Edit / Rename / Change ──
  if (/\b(edit|rename|change|update|modify)\b/.test(lower)) {
    return parseEdit(lower, roles);
  }

  // ── Info / Show / Details ──
  if (/\b(info|show|details|describe|what is|tell me about)\b/.test(lower)) {
    return parseInfo(lower, roles);
  }

  // ── List ──
  if (/\b(list|show all|all roles)\b/.test(lower)) {
    return {
      type: "info",
      description: "List all roles",
      params: {},
      confidence: 0.9,
    };
  }

  return {
    type: "unknown",
    description: "I didn't understand that command. Try: 'duplicate [role] to channels [channel1, channel2]' or 'delete [role]'",
    params: {},
    confidence: 0,
  };
}

function parseDuplicate(
  input: string,
  roles: RoleInfo[],
  channels: ChannelInfo[]
): CommandAction {
  const action: CommandAction = {
    type: "duplicate",
    description: "",
    params: {},
    confidence: 0.5,
  };

  // Find source role
  const sourceRole = findBestRoleMatch(input, roles);
  if (sourceRole) {
    action.params.sourceRoleId = sourceRole.id;
    action.params.sourceRoleName = sourceRole.name;
    action.confidence += 0.2;
  }

  // Find new name: "as [name]" or "named [name]" or "called [name]"
  const nameMatch = input.match(
    /(?:as|named|called|name it|name:)\s+["']?([^"',]+)["']?/i
  );
  if (nameMatch) {
    action.params.newName = nameMatch[1].trim();
    action.confidence += 0.1;
  }

  // Find channel selections: "in channels X, Y, Z" or "to channels X, Y, Z"
  const channelMatch = input.match(
    /(?:in|to|for|on)\s+(?:channels?\s+)?(.+?)(?:\s*$|\s+(?:and|with|as|named|called))/i
  );
  if (channelMatch) {
    const channelNames = channelMatch[1]
      .split(/[,\s]+(?:and\s+)?/)
      .map((s) => s.trim().replace(/^#/, ""))
      .filter(Boolean);

    const matchedChannels = channelNames
      .map((name) => findBestChannelMatch(name, channels))
      .filter((ch): ch is ChannelInfo => ch !== null);

    if (matchedChannels.length > 0) {
      action.params.channelIds = matchedChannels.map((ch) => ch.id);
      action.params.channelNames = matchedChannels.map((ch) => ch.name);
      action.confidence += 0.1;
    }
  }

  // Find copy count
  const countMatch = input.match(/(\d+)\s+(?:copies|times|x)/);
  if (countMatch) {
    action.params.count = Math.min(parseInt(countMatch[1]), 10);
  }

  // Copy members
  if (/\b(with members|copy members|include members)\b/.test(input)) {
    action.params.copyMembers = true;
  }

  // Build description
  const parts: string[] = [];
  parts.push(
    `Duplicate "${action.params.sourceRoleName || "?"}"`
  );
  if (action.params.newName) parts.push(`as "${action.params.newName}"`);
  if (action.params.channelNames) {
    const names = action.params.channelNames as string[];
    parts.push(`in ${names.length} channel${names.length > 1 ? "s" : ""}: ${names.join(", ")}`);
  }
  if (action.params.count) parts.push(`(${action.params.count} copies)`);
  if (action.params.copyMembers) parts.push("with member assignments");
  action.description = parts.join(" ");

  return action;
}

function parseDelete(input: string, roles: RoleInfo[]): CommandAction {
  const role = findBestRoleMatch(input, roles);
  return {
    type: "delete",
    description: role ? `Delete role "${role.name}"` : "Delete role (which one?)",
    params: role
      ? { roleId: role.id, roleName: role.name }
      : {},
    confidence: role ? 0.8 : 0.3,
  };
}

function parseEdit(input: string, roles: RoleInfo[]): CommandAction {
  const role = findBestRoleMatch(input, roles);
  const action: CommandAction = {
    type: "edit",
    description: "",
    params: {},
    confidence: 0.5,
  };

  if (role) {
    action.params.roleId = role.id;
    action.params.roleName = role.name;
    action.confidence += 0.2;
  }

  // Parse rename: "rename X to Y"
  const renameMatch = input.match(/rename\s+.+?\s+to\s+["']?([^"']+)["']?/i);
  if (renameMatch) {
    action.params.newName = renameMatch[1].trim();
    action.confidence += 0.1;
  }

  // Parse color: "color #ff5733" or "color red"
  const colorMatch = input.match(/#([0-9a-f]{6})\b/i);
  if (colorMatch) {
    action.params.color = parseInt(colorMatch[1], 16);
  }

  action.description = role
    ? `Edit role "${role.name}"${action.params.newName ? ` - rename to "${action.params.newName}"` : ""}`
    : "Edit role (which one?)";

  return action;
}

function parseInfo(input: string, roles: RoleInfo[]): CommandAction {
  const role = findBestRoleMatch(input, roles);
  return {
    type: "info",
    description: role
      ? `Show info for "${role.name}"`
      : "Show role info (which one?)",
    params: role ? { roleId: role.id, roleName: role.name } : {},
    confidence: role ? 0.9 : 0.3,
  };
}

// ── Fuzzy matching helpers ──

function findBestRoleMatch(
  input: string,
  roles: RoleInfo[]
): RoleInfo | null {
  // Strip command keywords to focus on the role name
  const cleaned = input
    .replace(
      /\b(duplicate|copy|clone|delete|remove|edit|rename|info|show|details|role|the|a|an|my)\b/gi,
      ""
    )
    .trim();

  let bestMatch: RoleInfo | null = null;
  let bestScore = 0;

  for (const role of roles) {
    const roleLower = role.name.toLowerCase();
    // Exact match
    if (cleaned.includes(roleLower)) {
      const score = roleLower.length; // Longer match = better
      if (score > bestScore) {
        bestScore = score;
        bestMatch = role;
      }
    }
  }

  return bestMatch;
}

function findBestChannelMatch(
  name: string,
  channels: ChannelInfo[]
): ChannelInfo | null {
  const nameLower = name.toLowerCase().replace(/^#/, "");

  // Exact match first
  const exact = channels.find((ch) => ch.name.toLowerCase() === nameLower);
  if (exact) return exact;

  // Partial match
  const partial = channels.find((ch) =>
    ch.name.toLowerCase().includes(nameLower)
  );
  return partial ?? null;
}
