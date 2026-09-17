const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const PORT = process.env.PORT || 3000;
let isReady = false;

// Initialize WhatsApp Web Client with Puppeteer flags
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('\n============================================================');
    console.log('📲 SCAN THIS QR CODE ON YOUR WHATSAPP MOBILE APP:');
    console.log('============================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isReady = true;
    console.log('\n============================================================');
    console.log('✅ WHATSAPP WEB CLIENT IS READY AND AUTHENTICATED!');
    console.log(`Connected Account: ${client.info ? client.info.pushname : 'WhatsApp Web Gateway'}`);
    console.log('============================================================\n');
});

client.on('authenticated', () => {
    console.log('[WhatsApp Bridge] Session authenticated successfully.');
});

client.on('auth_failure', (msg) => {
    isReady = false;
    console.error('[WhatsApp Bridge] Authentication failure:', msg);
});

client.on('disconnected', (reason) => {
    isReady = false;
    console.warn('[WhatsApp Bridge] Client disconnected:', reason);
    console.log('[WhatsApp Bridge] Re-initializing client...');
    client.initialize();
});

// Helper: Sanitize recipient phone number for WhatsApp Web chatId
function formatChatId(phone) {
    if (!phone) return null;
    let digits = String(phone).replace(/\D/g, '');
    if (!digits) return null;

    if (digits.length === 10) {
        digits = '91' + digits;
    } else if (digits.length === 11 && digits.startswith('0')) {
        digits = '91' + digits.substring(1);
    }

    if (!digits.endsWith('@c.us')) {
        return `${digits}@c.us`;
    }
    return digits;
}

// Health check endpoint
app.get('/status', (req, res) => {
    return res.json({
        ready: isReady,
        status: isReady ? 'READY' : 'NOT_AUTHENTICATED',
        info: isReady && client.info ? { pushname: client.info.pushname, wid: client.info.wid.user } : null
    });
});

// POST /send-message
app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;

    if (!isReady) {
        console.warn(`[Gateway 503] Rejecting message to ${phone}: WhatsApp Web client not authenticated.`);
        return res.status(503).json({
            success: false,
            error: 'WhatsApp Web gateway is not ready/authenticated yet. Please scan QR code in terminal.'
        });
    }

    const chatId = formatChatId(phone);
    if (!chatId || !message) {
        return res.status(400).json({ success: false, error: 'Recipient phone number and message body are required.' });
    }

    try {
        const result = await client.sendMessage(chatId, message);
        console.log(`[Message Sent] To: ${chatId} | Message ID: ${result.id ? result.id._serialized : 'OK'}`);
        return res.json({ success: true, messageId: result.id ? result.id._serialized : null });
    } catch (err) {
        console.error(`[Message Error] Failed to send message to ${chatId}:`, err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /send-document
app.post('/send-document', async (req, res) => {
    const { phone, mediaUrl, filePath, filename, caption } = req.body;

    if (!isReady) {
        console.warn(`[Gateway 503] Rejecting document to ${phone}: WhatsApp Web client not authenticated.`);
        return res.status(503).json({
            success: false,
            error: 'WhatsApp Web gateway is not ready/authenticated yet. Please scan QR code in terminal.'
        });
    }

    const chatId = formatChatId(phone);
    const targetPathOrUrl = mediaUrl || filePath;

    if (!chatId || !targetPathOrUrl) {
        return res.status(400).json({ success: false, error: 'Recipient phone and mediaUrl or filePath are required.' });
    }

    try {
        let media = null;
        const docName = filename || 'Document.pdf';

        if (targetPathOrUrl.startsWith('http://') || targetPathOrUrl.startsWith('https://')) {
            // Download remote media URL
            const response = await axios.get(targetPathOrUrl, { responseType: 'arraybuffer' });
            const contentType = response.headers['content-type'] || 'application/pdf';
            const base64Data = Buffer.from(response.data, 'binary').toString('base64');
            media = new MessageMedia(contentType, base64Data, docName);
        } else if (fs.existsSync(targetPathOrUrl)) {
            // Read local file path
            media = MessageMedia.fromFilePath(targetPathOrUrl);
            if (filename) media.filename = filename;
        } else {
            return res.status(400).json({ success: false, error: `Local file not found at path: ${targetPathOrUrl}` });
        }

        const options = { caption: caption || '', sendMediaAsDocument: true };
        const result = await client.sendMessage(chatId, media, options);
        console.log(`[Document Sent] To: ${chatId} | File: ${docName}`);
        return res.json({ success: true, messageId: result.id ? result.id._serialized : null });
    } catch (err) {
        console.error(`[Document Error] Failed to send document to ${chatId}:`, err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Start Express Server & initialize WhatsApp client
app.listen(PORT, () => {
    console.log(`\n🚀 WHATSAPP WEB HTTP GATEWAY LISTENING ON http://127.0.0.1:${PORT}`);
    console.log('Initializing WhatsApp Web Puppeteer client...\n');
    client.initialize();
});
