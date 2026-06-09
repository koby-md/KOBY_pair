import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pn from 'awesome-phonenumber';

const app = express();
const port = process.env.PORT || 7860;

app.use(express.json());

function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
    } catch (e) {
        console.error('Error removing file:', e);
    }
}

// 🌐 الواجهة الرسومية HTML للموقع بالكامل
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KOBY BOT - كود الاقتران</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Tajawal', sans-serif;
                background-color: #0f172a;
                color: #f8fafc;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                padding: 15px;
                box-sizing: border-box;
            }
            .container {
                background: #1e293b;
                padding: 30px;
                border-radius: 16px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                width: 100%;
                max-width: 450px;
                text-align: center;
                border: 1px solid #334155;
            }
            h1 {
                color: #38bdf8;
                font-size: 24px;
                margin-bottom: 10px;
            }
            p {
                color: #94a3b8;
                font-size: 14px;
                margin-bottom: 25px;
            }
            .input-group {
                margin-bottom: 20px;
                text-align: right;
            }
            label {
                display: block;
                margin-bottom: 8px;
                color: #cbd5e1;
                font-size: 14px;
            }
            input {
                width: 100%;
                padding: 12px;
                border: 2px solid #334155;
                border-radius: 8px;
                background: #0f172a;
                color: #fff;
                font-size: 16px;
                box-sizing: border-box;
                text-align: left;
                dir: ltr;
                transition: border-color 0.3s;
            }
            input:focus {
                border-color: #38bdf8;
                outline: none;
            }
            button {
                width: 100%;
                padding: 12px;
                background: #0284c7;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: background 0.3s;
            }
            button:hover {
                background: #0369a1;
            }
            button:disabled {
                background: #475569;
                cursor: not-allowed;
            }
            .result-box {
                margin-top: 25px;
                padding: 15px;
                border-radius: 8px;
                background: #0f172a;
                border: 1px dashed #38bdf8;
                display: none;
            }
            .code {
                font-size: 22px;
                font-weight: bold;
                color: #4ade80;
                letter-spacing: 2px;
                margin-top: 10px;
            }
            .error-box {
                margin-top: 20px;
                padding: 12px;
                border-radius: 8px;
                background: #7f1d1d;
                color: #fca5a5;
                font-size: 14px;
                display: none;
                border: 1px solid #b91c1c;
            }
            .loading {
                display: none;
                margin: 15px 0;
                color: #38bdf8;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>KOBY BOT 📱</h1>
            <p>استخرج كود اقتران واتساب وجلسة العمل بسهولة وأمان.</p>
            
            <div class="input-group">
                <label for="number">رقم الهاتف الدولي (مثال: 212612345678):</label>
                <input type="text" id="number" placeholder="212612345678">
            </div>
            
            <button id="btn" onclick="getPairCode()">الحصول على الرمز</button>
            
            <div id="loading" class="loading">⏳ جاري الاتصال وتوليد الكود، يرجى الانتظار...</div>
            <div id="error" class="error-box"></div>
            
            <div id="result" class="result-box">
                <span style="color: #cbd5e1;">رمز الاقتران الخاص بك هو:</span>
                <div id="code" class="code">----</div>
                <small style="color: #64748b; display:block; margin-top:10px;">سيصلك ملف الجلسة في الواتساب بعد قليل.</small>
            </div>
        </div>

        <script>
            async function getPairCode() {
                const numberInput = document.getElementById('number').value.trim();
                const btn = document.getElementById('btn');
                const loading = document.getElementById('loading');
                const errorBox = document.getElementById('error');
                const resultBox = document.getElementById('result');
                const codeDiv = document.getElementById('code');

                if(!numberInput) {
                    alert('الرجاء إدخال رقم الهاتف أولاً');
                    return;
                }

                // إعادة تهيئة الواجهة
                errorBox.style.display = 'none';
                resultBox.style.display = 'none';
                loading.style.display = 'block';
                btn.disabled = true;

                try {
                    const response = await fetch('/pair?number=' + encodeURIComponent(numberInput));
                    const data = await response.json();

                    loading.style.display = 'none';
                    btn.disabled = false;

                    if(response.ok && data.code) {
                        codeDiv.innerText = data.code;
                        resultBox.style.display = 'block';
                    } else {
                        errorBox.innerText = data.code || 'حدث خطأ غير متوقع.';
                        errorBox.style.display = 'block';
                    }
                } catch (err) {
                    loading.style.display = 'none';
                    btn.disabled = false;
                    errorBox.innerText = 'فشل الاتصال بالسيرفر. حاول مجدداً.';
                    errorBox.style.display = 'block';
                }
            }
        </script>
    </body>
    </html>
    `);
});

// 📥 مسار استخراج الكود البرمجي (دون تغيير)
app.get('/pair', async (req, res) => {
    let num = req.query.number;
    if (!num) {
        return res.status(400).send({ code: 'يرجى إدخال رقم الهاتف' });
    }

    let dirs = './' + (num || `session`);
    await removeFile(dirs);
    num = num.replace(/[^0-9]/g, '');

    const phone = pn('+' + num);
    if (!phone.isValid()) {
        if (!res.headersSent) {
            return res.status(400).send({ code: 'رقم الهاتف غير صحيح. يرجى إدخال الرقم الدولي الكامل.' });
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
                const { connection, lastDisconnect } = update;

                if (connection === 'open') {
                    try {
                        const sessionKoby = fs.readFileSync(dirs + '/creds.json');
                        const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                        
                        await KobyBot.sendMessage(userJid, {
                            document: sessionKoby,
                            mimetype: 'application/json',
                            fileName: 'creds.json'
                        });

                        await KobyBot.sendMessage(userJid, {
                            text: `⚠️ *تنبيه هام: لا تشارك هذا الملف مع أي شخص مطلقاً* ⚠️\n \n┌┤✑  شكراً لاستخدامك KOBY BOT\n│└────────────┈ ⳹        \n│©2026 KOBY BOT\n└─────────────────┈ ⳹\n\n`
                        });

                        await delay(1000);
                        removeFile(dirs);
                    } catch (error) {
                        console.error(error);
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
                        await res.send({ code });
                    }
                } catch (error) {
                    if (!res.headersSent) {
                        res.status(503).send({ code: 'فشل في الحصول على رمز الاقتران.' });
                    }
                }
            }

            KobyBot.ev.on('creds.update', saveCreds);
        } catch (err) {
            if (!res.headersSent) {
                res.status(503).send({ code: 'الخدمة غير متوفرة حالياً' });
            }
        }
    }

    await initiateSession();
});

app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});

process.on('uncaughtException', (err) => {
    let e = String(err);
    if (e.includes("conflict") || e.includes("not-authorized") || e.includes("timeout") || e.includes("Closed")) return;
    console.log('Caught exception: ', err);
});
