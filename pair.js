const express = require('express');
const readline = require("readline");
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
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
	const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const num = (text) => new Promise((resolve) => rl.question(text, resolve));
  //  let num = req.query.number;
        async function ovlPair() {
        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(`./session`)
     try {
            let ovl = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "silent"}).child({level: "silent"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "silent"}).child({level: "silent"}),
                browser: [ "Ubuntu", "Chrome", "20.0.04" ],
             });
             if(!ovl.authState.creds.registered) {
                await delay(1500);
                      //  num = num.replace(/[^0-9]/g,'');
		    num = num.replace(/^\+?[0-9]{2}([^0-9]*)/g, ''); 
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
                await delay(10000);
                    const sessionOvl = fs.readFileSync('./session/creds.json');
                    ovl.groupAcceptInvite("HCPANyNRGvkHRqSsNai4oB");
				const ov = await ovl.sendMessage(ovl.user.id, { document: sessionOvl, mimetype: `application/json`, fileName: `creds.json` };
                    quoted: xeonses
                });
				await ovl.sendMessage(ovl.user.id, { text: `Merci d'avoir choisie OVL-Md\n N'envoyer pas ce fichier a quelqu'un`}, {quoted: ov});
        await delay(100);
        return await removeFile('./session');
        process.exit(0)
            } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    ovlPair();
                }
            });
        } catch (err) {
            console.log("application redemarer");
            await removeFile('./session');
         if(!res.headersSent){
            await res.send({code:"application indisponible"});
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
