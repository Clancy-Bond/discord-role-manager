# Discord Role Manager

A Discord bot that lets you duplicate roles, bulk assign/remove roles, and manage server roles efficiently.

## Commands

| Command | Description |
|---------|-------------|
| `/duplicate-role` | Copy a role with all its permissions, color, hoist, and settings. Supports creating multiple copies and optionally copying members. |
| `/list-roles` | List all server roles with member counts. Add `detailed: true` for permissions/settings. |
| `/role-info` | Inspect a specific role - see permissions, members, creation date, and all settings. |
| `/bulk-assign` | Add or remove a role to/from all members who have another role (or all non-bot members). |

## Setup

### 1. Bot permissions

Your bot needs these in the Discord Developer Portal:
- **Bot permissions**: `Manage Roles`, `Send Messages`, `Use Slash Commands`
- **Privileged intents**: Enable **Server Members Intent** (needed for member-related features)

### 2. Install and configure

```bash
git clone https://github.com/Clancy-Bond/discord-role-manager.git
cd discord-role-manager
npm install
cp .env.example .env
```

Edit `.env` with your bot token and client ID:
```
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-client-id
```

### 3. Deploy slash commands

```bash
npm run deploy
```

This registers the commands with Discord. You only need to run this once (or when you add new commands).

### 4. Start the bot

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Important Notes

- The bot can only manage roles **below** its own highest role in the server hierarchy
- Move the bot's role above all roles you want it to manage in Server Settings > Roles
- The `/duplicate-role` command copies: name, color, permissions, hoist, mentionable, and icon (if Boost Level 2+)
- All commands require the **Manage Roles** permission to use
