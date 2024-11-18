const express = require('express');
const axios = require('axios');
const fs = require('fs');
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

let router = express.Router();

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function ovlPair() {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState('./sessionpair');

        try {
            let ovl = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }).child({ level: "silent" }))
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }).child({ level: "silent" }),
                browser: ['OVL-MD', "chrome", "1.0.0"],
                version,
                fireInitQueries: false,
                shouldSyncHistoryMessage: true,
                downloadHistory: true,
                syncFullHistory: true,
                generateHighQualityLinkPreview: true,
                markOnlineOnConnect: false,
            });

            if (!ovl.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await ovl.requestPairingCode(num);
                if (!res.headersSent) {
                    res.send({ code });
                }
            }

            ovl.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    let user = ovl.user.id;
                    let creds = fs.readFileSync('./sessionpair/creds.json', 'utf-8');

                    try {
                        const response = await axios.post('https://pastebin.com/api/api_post.php', new URLSearchParams({
                            api_dev_key: 'E4AVswX1Fj6CRitqofpUwTX4Y2VdDmMR',
                            api_option: 'paste',
                            api_paste_code: creds,
                            api_paste_expire_date: 'N'
                        }), {
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                        });

                        const pastebinLink = response.data.split('/')[3];
                        await ovl.groupAcceptInvite("KMvPxy6Xw7yA49xRLNCxEb");
                        await ovl.sendMessage(user, { text: `Ovl-MD_${pastebinLink}_SESSION-ID` });
                        await ovl.sendMessage(user, {
                            image: { url: 'https://telegra.ph/file/4d918694f786d7acfa3bd.jpg' },
                            caption: "Merci d'avoir choisi OVL-MD voici votre SESSION-ID⏏️"
                        });

                        setTimeout(() => {
                            removeFile('./sessionpair');
                            process.exit(0);
                        }, 600000);
                    } catch (error) {
                        console.error("Erreur lors de l'envoi vers Pastebin :", error);
                    }
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    setTimeout(ovlPair, 10000);
                }
            });

            ovl.ev.on('messages.upsert', async (m) => {
                try {
                    const message = m.messages[0];
                    if (!message.key.fromMe && m.type === 'notify') {
                        const from = message.key.remoteJid;
                        const text = message.message.conversation || message.message.extendedTextMessage?.text;

                        if (text === 'ping') {
                            await ovl.sendMessage(from, { text: 'Pong!' });
                        }

                        if (message.messageContextInfo?.quotedMessage) {
                            const quotedMsgId = message.messageContextInfo.stanzaId;
                            const quotedMessage = await ovl.loadMessage(from, quotedMsgId);
                            console.log('Message cité:', quotedMessage);
                        }
                    }
                } catch (err) {
                    console.error('Erreur lors du traitement du message:', err);
                }
            });

            ovl.ev.on('creds.update', saveCreds);
        } catch (err) {
            console.error("Service redémarré :", err);
            removeFile('./sessionpair');
            if (!res.headersSent) {
                res.send({ code: "Service Unavailable" });
            }
        }
    }

    await ovlPair();
});

process.on('uncaughtException', (err) => {
    let e = String(err);
    if (["conflict", "Socket connection timeout", "not-authorized", "rate-overlimit", "Connection Closed", "Timed Out", "Value not found"].some(msg => e.includes(msg))) {
        return;
    }
    console.error('Caught exception:', err);
});

module.exports = router;
