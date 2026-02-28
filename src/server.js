const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const { PermissionsBitField } = require('discord.js');

const DISCORD_API = 'https://discord.com/api/v10';

function startServer(discordClient) {
  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(
    session({
      secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
    })
  );

  // ── Auth middleware ──
  function requireAuth(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
    next();
  }

  // ── OAuth2 login ──
  app.get('/auth/login', (req, res) => {
    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      redirect_uri: `http://localhost:${PORT}/auth/callback`,
      response_type: 'code',
      scope: 'identify guilds',
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  });

  app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/?error=no_code');

    try {
      // Exchange code for token
      const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `http://localhost:${PORT}/auth/callback`,
        }),
      });
      const tokens = await tokenRes.json();

      if (!tokens.access_token) {
        console.error('OAuth token error:', tokens);
        return res.redirect('/?error=token_failed');
      }

      // Get user info
      const userRes = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const user = await userRes.json();

      req.session.user = {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        accessToken: tokens.access_token,
      };

      res.redirect('/');
    } catch (err) {
      console.error('OAuth error:', err);
      res.redirect('/?error=oauth_failed');
    }
  });

  app.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });

  app.get('/api/me', (req, res) => {
    if (!req.session.user) return res.json({ authenticated: false });
    const { accessToken, ...user } = req.session.user;
    res.json({ authenticated: true, user });
  });

  // ── API: List servers the bot is in ──
  app.get('/api/guilds', requireAuth, (req, res) => {
    const guilds = discordClient.guilds.cache.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL({ size: 64 }),
      memberCount: g.memberCount,
    }));
    res.json(guilds);
  });

  // ── API: List roles in a guild ──
  app.get('/api/guilds/:guildId/roles', requireAuth, async (req, res) => {
    try {
      const guild = discordClient.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });

      // Check user is a member with Manage Roles
      const member = await guild.members.fetch(req.session.user.id).catch(() => null);
      if (!member || !member.permissions.has('ManageRoles')) {
        return res.status(403).json({ error: 'You need Manage Roles permission' });
      }

      const roles = guild.roles.cache
        .filter((r) => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => ({
          id: r.id,
          name: r.name,
          color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : null,
          colorInt: r.color,
          hoist: r.hoist,
          position: r.position,
          mentionable: r.mentionable,
          managed: r.managed,
          memberCount: r.members.size,
          permissions: r.permissions.toArray(),
          createdAt: r.createdAt.toISOString(),
        }));

      res.json(roles);
    } catch (err) {
      console.error('Error fetching roles:', err);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  });

  // ── API: Duplicate a role ──
  app.post('/api/guilds/:guildId/roles/:roleId/duplicate', requireAuth, async (req, res) => {
    try {
      const guild = discordClient.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });

      const member = await guild.members.fetch(req.session.user.id).catch(() => null);
      if (!member || !member.permissions.has('ManageRoles')) {
        return res.status(403).json({ error: 'You need Manage Roles permission' });
      }

      const sourceRole = guild.roles.cache.get(req.params.roleId);
      if (!sourceRole) return res.status(404).json({ error: 'Role not found' });

      const botMember = guild.members.me;
      if (sourceRole.position >= botMember.roles.highest.position) {
        return res.status(400).json({ error: 'Role is above bot position in hierarchy' });
      }

      const { name, count = 1, copyMembers = false } = req.body;
      const copies = Math.min(Math.max(count, 1), 10);
      const created = [];

      for (let i = 0; i < copies; i++) {
        let roleName;
        if (name) {
          roleName = copies > 1 ? `${name} ${i + 1}` : name;
        } else {
          roleName = copies > 1 ? `Copy of ${sourceRole.name} ${i + 1}` : `Copy of ${sourceRole.name}`;
        }

        const newRole = await guild.roles.create({
          name: roleName,
          color: sourceRole.color,
          hoist: sourceRole.hoist,
          permissions: sourceRole.permissions,
          mentionable: sourceRole.mentionable,
          reason: `Duplicated from "${sourceRole.name}" via Role Manager dashboard`,
        });

        try {
          await newRole.setPosition(sourceRole.position - 1);
        } catch {}

        created.push({
          id: newRole.id,
          name: newRole.name,
          color: newRole.color ? `#${newRole.color.toString(16).padStart(6, '0')}` : null,
          _discordRole: newRole,
        });
      }

      // Copy channel permission overrides
      let channelsCopied = 0;
      const channels = guild.channels.cache;
      for (const [, channel] of channels) {
        const overwrite = channel.permissionOverwrites?.cache.get(sourceRole.id);
        if (!overwrite) continue;

        let channelSuccess = false;
        for (const entry of created) {
          try {
            const permOverrides = {};
            new PermissionsBitField(overwrite.allow).toArray().forEach(p => permOverrides[p] = true);
            new PermissionsBitField(overwrite.deny).toArray().forEach(p => permOverrides[p] = false);
            await channel.permissionOverwrites.edit(entry._discordRole, permOverrides);
            channelSuccess = true;
          } catch (err) {
            console.error(`Channel override copy failed for #${channel.name}:`, err.message);
          }
        }
        if (channelSuccess) channelsCopied++;
      }

      // Copy members if requested
      let membersCopied = 0;
      if (copyMembers) {
        const members = await guild.members.fetch();
        const sourceMembers = members.filter((m) => m.roles.cache.has(sourceRole.id));
        for (const [, m] of sourceMembers) {
          try {
            for (const role of created) {
              const r = guild.roles.cache.get(role.id);
              if (r) await m.roles.add(r);
            }
            membersCopied++;
          } catch {}
        }
      }

      // Clean internal refs before sending response
      const cleanCreated = created.map(({ _discordRole, ...rest }) => rest);
      res.json({ created: cleanCreated, membersCopied, channelsCopied });
    } catch (err) {
      console.error('Error duplicating role:', err);
      res.status(500).json({ error: 'Failed to duplicate role' });
    }
  });

  // ── API: Delete a role ──
  app.delete('/api/guilds/:guildId/roles/:roleId', requireAuth, async (req, res) => {
    try {
      const guild = discordClient.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });

      const member = await guild.members.fetch(req.session.user.id).catch(() => null);
      if (!member || !member.permissions.has('ManageRoles')) {
        return res.status(403).json({ error: 'You need Manage Roles permission' });
      }

      const role = guild.roles.cache.get(req.params.roleId);
      if (!role) return res.status(404).json({ error: 'Role not found' });
      if (role.managed) return res.status(400).json({ error: 'Cannot delete managed/bot role' });

      await role.delete('Deleted via Role Manager dashboard');
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting role:', err);
      res.status(500).json({ error: 'Failed to delete role' });
    }
  });

  // ── API: Edit a role ──
  app.patch('/api/guilds/:guildId/roles/:roleId', requireAuth, async (req, res) => {
    try {
      const guild = discordClient.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });

      const member = await guild.members.fetch(req.session.user.id).catch(() => null);
      if (!member || !member.permissions.has('ManageRoles')) {
        return res.status(403).json({ error: 'You need Manage Roles permission' });
      }

      const role = guild.roles.cache.get(req.params.roleId);
      if (!role) return res.status(404).json({ error: 'Role not found' });

      const { name, color, hoist, mentionable } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;
      if (hoist !== undefined) updates.hoist = hoist;
      if (mentionable !== undefined) updates.mentionable = mentionable;

      await role.edit(updates);
      res.json({ success: true, role: { id: role.id, name: role.name } });
    } catch (err) {
      console.error('Error editing role:', err);
      res.status(500).json({ error: 'Failed to edit role' });
    }
  });

  // ── SPA fallback ──
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
  });
}

module.exports = startServer;
