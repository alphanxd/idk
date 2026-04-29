'use strict';

const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const config = require('./settings.json');

let bot = null;
let reconnectAttempts = 0;
let attackInterval = null;

// =========================
// RECONNECT DELAY
// =========================
function getDelay() {
  const base = config.utils["base-delay"];
  const max = config.utils["max-delay"];
  return Math.min(base * Math.pow(2, reconnectAttempts), max);
}

// =========================
// CREATE BOT
// =========================
function createBot() {
  console.log('[Bot] Starting...');

  bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    username: config["bot-account"].username,
    auth: config["bot-account"].type,
    version: config.server.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('[Bot] ✅ Connected!');
    reconnectAttempts = 0;

    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    startAntiAFK();
    startAutoEat();
    startDefense();
  });

  bot.on('end', () => {
    console.log('[Bot] ❌ Disconnected');
    reconnect();
  });

  bot.on('kicked', (reason) => {
    console.log('[Bot] ⚠️ Kicked:', reason);
  });

  bot.on('error', (err) => {
    console.log('[Bot] Error:', err.message);
  });
}

// =========================
// RECONNECT SYSTEM
// =========================
function reconnect() {
  if (!config.utils["auto-reconnect"]) return;

  reconnectAttempts++;
  const delay = getDelay();

  console.log(`[Bot] Reconnecting in ${delay / 1000}s...`);
  setTimeout(createBot, delay);
}

// =========================
// ANTI AFK
// =========================
function startAntiAFK() {
  setInterval(() => {
    if (!bot || !bot.entity) return;

    try {
      bot.swingArm();

      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0);

      if (Math.random() > 0.5) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
      }
    } catch {}
  }, 15000);
}

// =========================
// AUTO EAT
// =========================
function startAutoEat() {
  bot.on('health', () => {
    try {
      if (bot.food > 14) return;

      const food = bot.inventory.items().find(i => i.foodPoints > 0);

      if (food) {
        bot.equip(food, 'hand')
          .then(() => bot.consume())
          .catch(() => {});
      }
    } catch {}
  });
}

// =========================
// DEFENSE SYSTEM
// =========================
function startDefense() {
  bot.on('entityHurt', (entity) => {
    if (!bot.entity || entity !== bot.entity) return;

    const attacker = Object.values(bot.entities).find(e => {
      return e.type === 'player' &&
        e.username !== bot.username &&
        bot.entity.position.distanceTo(e.position) < 4;
    });

    if (attacker) {
      console.log('[Defense] Attacked by', attacker.username);
      attackTarget(attacker);
    }
  });
}

function attackTarget(target) {
  if (attackInterval) clearInterval(attackInterval);

  attackInterval = setInterval(() => {
    if (!bot || !target) return;

    if (!target.position || bot.entity.position.distanceTo(target.position) > 5) {
      clearInterval(attackInterval);
      return;
    }

    try {
      bot.lookAt(target.position.offset(0, target.height, 0));
      bot.attack(target);
    } catch {}
  }, 700);
}

// =========================
// START WITH DELAY (IMPORTANT)
// =========================
setTimeout(createBot, 20000);