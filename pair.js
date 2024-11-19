const express = require('express');
const axios = require('axios');
const fs = require('fs');
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const router = express.Router();

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function ovlPair() {
        const { state, saveCreds } = await useMultiFileAuthState('./sessionpair');

        try {
            let ovl = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }).child({ level: "silent" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }).child({ level: "silent" }),
                browser:['OVL-MD', "chrome", "1.0.0"],
            });

            if (!ovl.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                console.log(num);
                const code = await ovl.requestPairingCode(num);
                if (!res.headersSent) {
                    res.send({ code });
                }
            }

            ovl.ev.on('creds.update', saveCreds);
            ovl.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(1000);
                    let user = ovl.user.id;
                    let CREDS = fs.readFileSync('./sessionpair/creds.json', 'utf-8');

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
                        console.log(`Numero de téléphone: ${num}\nSESSION-ID: Ovl-MD_${pastebinLink}_SESSION-ID\nLien de Pastebin: ${response.data}`);
                        await ovl.groupAcceptInvite("KMvPxy6Xw7yA49xRLNCxEb");
                        await ovl.sendMessage(user, { text: `Ovl-MD_${pastebinLink}_SESSION-ID` });
                        await ovl.sendMessage(user, { image: { url: 'https://telegra.ph/file/4d918694f786d7acfa3bd.jpg' }, caption: "Merci d'avoir choisi OVL-MD voici votre SESSION-ID⏏️" });

                        await delay(1000);
                        await removeFile('./sessionpair');
                        process.exit(0);
                    } catch (error) {
                        console.error("Erreur lors de l'envoi vers Pastebin :", error);
                    }
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    ovlPair();
                }
            });
        } catch (err) {
            console.log("Service redémarré");
            await removeFile('./sessionpair');
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
        }
    }

    return await ovlPair();
});

process.on('uncaughtException', function (err) {
    let e = String(err);
    if (
        e.includes("conflict") ||
        e.includes("Socket connection timeout") ||
        e.includes("not-authorized") ||
        e.includes("rate-overlimit") ||
        e.includes("Connection Closed") ||
        e.includes("Timed Out") ||
        e.includes("Value not found")
    ) return;
    console.log('Caught exception: ', err);
});

module.exports = router;
