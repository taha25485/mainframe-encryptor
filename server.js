require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const app = express();
app.use(express.json());
app.use(express.static('.')); // Serve web app

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const SALT = 'platform-salt-2024'; // Same as web

function sha512Hash(str) {
    return crypto.createHash('sha512').update(str).digest('base64');
}

function deriveKey(password) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, SALT, 100000, 32, 'sha512', (err, key) => {
            if (err) reject(err);
            resolve(key);
        });
    });
}

async function encrypt(plaintext, password) {
    const key = await deriveKey(password);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, Buffer.from(encrypted, 'base64'), authTag]);
    return combined.toString('base64');
}

async function decrypt(base64ciphertext, password) {
    const combined = Buffer.from(base64ciphertext, 'base64');
    const iv = combined.slice(0, 12);
    const authTag = combined.slice(-16);
    const ciphertext = combined.slice(12, -16);
    const key = await deriveKey(password);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Web API endpoints (optional, for advanced use)
app.post('/api/encrypt', async (req, res) => {
    try {
        const { password, message } = req.body;
        const encrypted = await encrypt(message, password);
        res.json({ encrypted });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/decrypt', async (req, res) => {
    try {
        const { password, encrypted } = req.body;
        const decrypted = await decrypt(encrypted, password);
        res.json({ decrypted });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Telegram Bot Commands
bot.start((ctx) => ctx.reply('Send /encrypt <password> <message> or /decrypt <password> <encrypted>'));
bot.command('encrypt', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('Usage: /encrypt password message');
    const [, password, ...messageParts] = args;
    const message = messageParts.join(' ');
    try {
        const encrypted = await encrypt(message, password);
        ctx.reply(`Encrypted: ${encrypted}`);
    } catch (e) { ctx.reply(`Error: ${e.message}`); }
});
bot.command('decrypt', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('Usage: /decrypt password encrypted_text');
    const [, password, encrypted] = args;
    try {
        const decrypted = await decrypt(encrypted, password);
        ctx.reply(`Decrypted: ${decrypted}`);
    } catch (e) { ctx.reply(`Error: ${e.message}`); }
});

bot.launch();
app.listen(3000, () => console.log('Web at http://localhost:3000 | Bot running'));
