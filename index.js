'use strict';

// =======================
// RENDER WEB SERVER
// =======================
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ Bot is running');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Web] Server running on port ${PORT}`);
});

// =======================
// MINECRAFT BOT
// =======================
const mineflayer = require('mineflayer');
const config = require('./settings.json');

let bot = null;

function createBot() {
  console.log('[Bot] Starting...');

  bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    username: config["bot-account"].username,
    auth: config["bot-account"].type,
    version: false
  });

  bot.on('spawn', () => {
    console.log('[Bot] ✅ Connected!');

    // Anti-AFK (simple + stable)
    setInterval(() => {
      if (!bot) return;

      try {
        bot.swingArm();
        bot.setControlState('jump', true);

        setTimeout(() => {
          if (bot) bot.setControlState('jump', false);
        }, 500);

      } catch (e) {}
    }, 30000);
  });

  bot.on('end', () => {
    console.log('[Bot] ❌ Disconnected');
    reconnect();
  });

  bot.on('error', (err) => {
    console.log('[Bot] Error:', err.code || err.message);
  });
}

function reconnect() {
  console.log('[Bot] Reconnecting in 10s...');
  setTimeout(createBot, 10000);
}

// Start bot (delay for Aternos startup)
setTimeout(createBot, 15000);
