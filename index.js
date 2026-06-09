import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pn from 'awesome-phonenumber';

const app = express();
const port = process.env.PORT || 7860; // منفذ هادجينج فيس الافتراضي

app.use(express.json());

// دالة حذف المجلد المؤقت للجلسة
function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
    } catch (e) {
        console.error('Error removing file:', e);
    }
}

// مسار رئيسي لعرض حالة السيرفر وتجنب إغلاق المنصة للحاوية
app.get('/', (req, res) => {
    res.send({ status: "alive", message: "KOBY BOT Pairing Service is running perfectly!" });
});

// مسار الحصول على رمز الاقتران (مثال: /pair?number=212612345678)
app.get('/pair', async (req, res) => {
    let num = req.query.number;
    if (!num) {
        return res.status(400).send({ code: 'يرجى إدخال رقم الهاتف في الرابط. مثال: /pair?number=212612345678' });
    }

    let dirs = './' + (num || `session`);

    // إزالة الجلسة السابقة إن وجدت
    await removeFile(dirs);

    // تنظيف الرقم من أي رموز
    num = num.replace(/[^0-9]/g, '');

    // التحقق من صحة الرقم
    const phone = pn('+' + num);
    if (!phone.isValid()) {
        if (!res.headersSent) {
            return res.status(400).send({ code: 'رقم الهاتف غير صحيح. يرجى إدخال الرقم الدولي الكامل بدون رمز + أو مسافات.' });
        }
        return;
    }
    
    num = phone.getNumber('e164').replace('+', '');

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            const { version } = await fetchLatestBaileysVersion();
            let KobyBot = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows('Chrome'),
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                retryRequestDelayMs: 250,
                maxRetries: 5,
            });

            KobyBot.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, isNewLogin, isOnline } = update;

                if (connection === 'open') {
                    console.log("✅ Connected successfully!");
                    try {
                        const sessionKoby = fs.readFileSync(dirs + '/creds.json');
                        const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                        
                        // 1. إرسال ملف الـ creds.json
                        await KobyBot.sendMessage(userJid, {
                            document: sessionKoby,
                            mimetype: 'application/json',
                            fileName: 'creds.json'
                        });

                        // 2. إرسال رسالة التحذير
                        await KobyBot.sendMessage(userJid, {
                            text: `⚠️ *تنبيه هام: لا تشارك هذا الملف مع أي شخص مطلقاً* ⚠️\n \n┌┤✑  شكراً لاستخدامك KOBY BOT\n│└────────────┈ ⳹        \n│©2026 KOBY BOT\n└─────────────────┈ ⳹\n\n`
                        });

                        await delay(1000);
                        removeFile(dirs);
                    } catch (error) {
                        console.error("❌ Error sending messages:", error);
                        removeFile(dirs);
                    }
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    if (statusCode !== 401) {
                        initiateSession();
                    }
                }
            });

            if (!KobyBot.authState.creds.registered) {
                await delay(3000); 
                num = num.replace(/[^\d+]/g, '');
                if (num.startsWith('+')) num = num.substring(1);

                try {
                    let code = await KobyBot.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    if (!res.headersSent) {
                        console.log({ num, code });
                        await res.send({ code });
                    }
                } catch (error) {
                    console.error('Error requesting pairing code:', error);
                    if (!res.headersSent) {
                        res.status(503).send({ code: 'فشل في الحصول على رمز الاقتران.' });
                    }
                }
            }

            KobyBot.ev.on('creds.update', saveCreds);
        } catch (err) {
            console.error('Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'الخدمة غير متوفرة حالياً' });
            }
        }
    }

    await initiateSession();
});

// تشغيل سيرفر الويب والاستماع للمنفذ المطلوب لـ Hugging Face لضمان استمرار العمل
app.listen(port, () => {
    console.log(`🚀 Server is running and listening on port ${port}`);
});

// التعامل مع الأخطاء غير المتوقعة لمنع انهيار التطبيق
process.on('uncaughtException', (err) => {
    let e = String(err);
    if (e.includes("conflict") || e.includes("not-authorized") || e.includes("timeout") || e.includes("Closed")) return;
    console.log('Caught exception: ', err);
});
