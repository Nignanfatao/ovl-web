const express = require('express');
const axios = require('axios');  
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
const path = require('path');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

function removeFile(FilePath){
    if(!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true })
 };
router.get('/', async (req, res) => {
    let num = req.query.number;
  async function ovlPair() {
        const {
            state,
            saveCreds
  } = await useMultiFileAuthState('./sessionpair');
     try {
            let ovl = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "fatal"}).child({level: "fatal"}),
                browser: [ "Ubuntu", "Chrome", "20.0.04" ],
             });
             if(!ovl.authState.creds.registered) {         await delay(1500);
                        num = num.replace(/[^0-9]/g,'');
                            const code = await ovl.requestPairingCode(num)
                 if(!res.headersSent){
                 await res.send({code});
                     }
                 }
            ovl.ev.on('creds.update', saveCreds)
            ovl.ev.on("connection.update", async (s) => {
                const {
                    connection,
                    lastDisconnect
                } = s;
                if (connection == "open") {
                await delay(1000);
                let user = ovl.user.id;
                let CREDS = fs.readFileSync('./auth/creds.json');
                var Scan_Id = Buffer.from(CREDS).toString('base64');
              //  Envoi de la session à 0bin
                    const response = await axios.post('https://0bin.net/', Scan_Id, {
                        headers: { 'Content-Type': 'application/octet-stream' },
                        params: { expire: 315360000 } // Expiration en secondes pour 10 ans
                    });

                    const id_bin = response.data.split('/')[4];

                    await ovl.groupAcceptInvite("KMvPxy6Xw7yA49xRLNCxEb");
                    await ovl.sendMessage(user, { text: `Ovl-MD_${id_bin}_SESSION-ID` });
                    await ovl.sendMessage(user, { image: { url: 'https://telegra.ph/file/4d918694f786d7acfa3bd.jpg' }, caption: "Merci d'avoir choisi OVL-MD voici votre SESSION-ID⏏️" });

                    await delay(1000);  await delay(1000);
    return await removeFile('./sessionpair');
        process.exit(0)
            } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    ovlPair();
                }
            });
        } catch (err) {
            console.log("service restated");
            await removeFile('./sessionpair');
         if(!res.headersSent){
            await res.send({code:"Service Unavailable"});
         }
        }
    }
    return await ovlPair()
});

process.on('uncaughtException', function (err) {
let e = String(err)
if (e.includes("conflict")) return
if (e.includes("Socket connection timeout")) return
if (e.includes("not-authorized")) return
if (e.includes("rate-overlimit")) return
if (e.includes("Connection Closed")) return
if (e.includes("Timed Out")) return
if (e.includes("Value not found")) return
console.log('Caught exception: ', err)
})

module.exports = router
