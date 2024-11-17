const express = require('express');
const axios = require('axios');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
/*const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");*/
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, jidDecode, getContentType, downloadContentFromMessage, makeInMemoryStore, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");

// Fonction pour supprimer les fichiers de session
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function ovlPair() {
        // Supprimer les fichiers de session avant de démarrer
        removeFile('./sessionpair');

        const { state, saveCreds } = await useMultiFileAuthState('./sessionpair');
        const { version, isLatest } = await fetchLatestBaileysVersion();
           const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store"
  })
});
        
        try {
            let ovl = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }).child({ level: "silent" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }).child({ level: "silent" }),
                browser: ["Ubuntu", "Chrome", "20.0.04"],
                getMessage: async (key) => {
        try {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id, undefined);
                return msg.message || undefined;
            }
        } catch (error) {
            console.error("Error loading message:", error);
        }
        return {
            conversation: 'An error occurred. Please try again later.'
        };
    },
            });
            store.bind(ovl.ev);
         setInterval(() => { store.writeToFile(__dirname + "/store.json");  }, 3000);
 

            // Vérifier si une session existante est détectée
            if (ovl.authState.creds.registered) {
                console.log("Session existante détectée, suppression...");
                await ovl.logout();
                removeFile('./sessionpair');
                return ovlPair(); // Redémarrer avec une session propre
            }

            if (!ovl.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await ovl.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            ovl.ev.on("messages.upsert", async (m) => {
    const { messages } = m;
    const ms = messages[0];
    if (!ms.message) return;
    
    const decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server && `${decode.user}@${decode.server}`) || jid;
        }
        return jid;
    };

    var mtype = getContentType(ms.message);
    var texte = mtype === "conversation" ? ms.message.conversation :
        mtype === "imageMessage" ? ms.message.imageMessage?.caption :
        mtype === "videoMessage" ? ms.message.videoMessage?.caption :
        mtype === "extendedTextMessage" ? ms.message.extendedTextMessage?.text :
        mtype === "buttonsResponseMessage" ? ms.message.buttonsResponseMessage?.selectedButtonId :
        mtype === "listResponseMessage" ? ms.message.listResponseMessage?.singleSelectReply?.selectedRowId :
        mtype === "messageContextInfo" ? (ms.message.buttonsResponseMessage?.selectedButtonId || ms.message.listResponseMessage?.singleSelectReply?.selectedRowId || ms.text) : "";
    console.log("{}=={} OVL-MD LOG-MESSAGES {}=={}");
    console.log("Type: " + mtype);
    console.log("Message:");
    console.log(texte);
                
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
                        console.log(`Lien de Pastebin : ${response.data}`);
                        await ovl.groupAcceptInvite("KMvPxy6Xw7yA49xRLNCxEb");
                        await ovl.sendMessage(user, { text: `Ovl-MD_${pastebinLink}_SESSION-ID` });
                        await ovl.sendMessage(user, { image: { url: 'https://telegra.ph/file/4d918694f786d7acfa3bd.jpg' }, caption: "Merci d'avoir choisi OVL-MD voici votre SESSION-ID⏏️" });

                        await delay(1000000);
                        await removeFile('./sessionpair');
                        process.exit(0);
                    } catch (error) {
                        console.error("Erreur lors de l'envoi vers Pastebin :", error);
                    }
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000000);
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
