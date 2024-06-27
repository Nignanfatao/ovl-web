const express = require('express');
const fs = require('fs');
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const router = express.Router();

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function ovlPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`../auth/creds.json`);
        try {
            let ovl = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }).child({ level: "silent" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }).child({ level: "silent" }),
                browser: ["Ubuntu", "Chrome", "20.0.04"],
            });

            if (!ovl.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await ovl.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            ovl.ev.on('creds.update', saveCreds);
            ovl.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    await delay(10000);
                    let creds = fs.readFileSync(auth + 'creds.json');
                    await ovl.groupAcceptInvite("LhnBI1Igg7W1ZgyqT8gIxa");
                    const scanId = Buffer.from(creds).toString('base64');
                    await ovl.sendMessage(user, { text: `Ovl;;; ${scanId}` });
                    await ovl.sendMessage(user, { image: { url: 'https://telegra.ph/file/0d81626ca4a81fe93303a.jpg' }, caption: "Merci d'avoir choisi OVL-MD" });
                    await delay(100);
                    await removeFile('../auth/creds.json');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    ovlPair();
                }
            });
        } catch (err) {
            console.log("Application redémarrée");
            await removeFile('../auth/creds.json');
            if (!res.headersSent) {
                await res.send({ code: "application indisponible" });
            }
        }
    }

    return await ovlPair();
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
