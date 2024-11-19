const express = require('express');
const fs = require('fs');
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const { toDataURL } = require('qrcode');

const router = express.Router();

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    async function ovlQr() {
        const { state, saveCreds } = await useMultiFileAuthState('./auth');

        try {
            const ovl = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }).child({ level: "silent" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }).child({ level: "silent" }),
                browser:['OVL-MD', "chrome", "1.0.0"],
            });

            const qrOptions = {
                width: req.query.width || 270,
                height: req.query.height || 270,
                color: {
                    dark: req.query.darkColor || '#000000',
                    light: req.query.lightColor || '#ffffff'
                }
            };

            ovl.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect, qr } = s;
                const { qr } = s;
                if (qr) {
                    try {
                        const qrDataURL = await toDataURL(qr, qrOptions);
                        const data = qrDataURL.split(',')[1];
                        if (!res.headersSent) {
                            res.send(data);
                        }
                    } catch (err) {
                        console.error('Erreur lors de la génération du QR code :', err);
                        res.status(500).send('Erreur lors de la génération du QR code');
                    }
                }
            });
            
            ovl.ev.on('creds.update', saveCreds);

            ovl.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    await delay(1000);
                    let user = ovl.user.id;
                    let CREDS = fs.readFileSync('./auth/creds.json', 'utf-8');
                    try {
                        const response = await axios.post('https://pastebin.com/api/api_post.php', new URLSearchParams({
                            api_dev_key: 'E4AVswX1Fj6CRitqofpUwTX4Y2VdDmMR',
                            api_option: 'paste',
                            api_paste_code: CREDS,
                            api_paste_expire_date: 'N'
                        }), {
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                        });

                        const pastebinLink = response.data.split('/')[3];
                        console.log(`Lien de Pastebin : ${response.data}`);
                        await ovl.groupAcceptInvite("KMvPxy6Xw7yA49xRLNCxEb");
                        await ovl.sendMessage(user, { text: `Ovl-MD_${pastebinLink}_SESSION-ID` });
                        await ovl.sendMessage(user, { image: { url: 'https://telegra.ph/file/4d918694f786d7acfa3bd.jpg' }, caption: "Merci d'avoir choisi OVL-MD voici votre SESSION-ID⏏️" });

                        await delay(1000);
                        await removeFile('./auth');
                        process.exit(0);
                    } catch (error) {
                        console.error("Erreur lors de l'envoi vers Pastebin :", error);
                    }
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    ovlQr();
                }
            });

        } catch (err) {
            console.log("Service redémarré");
            removeFile('./auth');
            if (!res.headersSent) {
                res.send({ code: "Service Unavailable" });
            }
        }
    }

    return await ovlQr();
});

process.on('uncaughtException', function (err) {
    let e = String(err);
    if (e.includes("conflict")) return;
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("not-authorized")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    console.log('Caught exception: ', err);
});

module.exports = router;
