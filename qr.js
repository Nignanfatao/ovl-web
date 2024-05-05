const express = require("express");
const router = express.Router();
const fs = require("fs-extra");
const { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason, makeInMemoryStore } = require("@whiskeysockets/baileys");
const { toBuffer } = require("qrcode");

const authInfoPath = __dirname + '/session';

// Création ou vidage du répertoire auth_info_baileys
if (!fs.existsSync(authInfoPath)) {
  try {
    fs.mkdirSync(authInfoPath);
    console.log('Répertoire créé avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création du répertoire auth_info_baileys :', error);
  }
} else {
  console.log('Le répertoire auth_info_baileys existe déjà.');
}

try {
  fs.emptyDirSync(authInfoPath);
  console.log('Contenu du répertoire auth_info_baileys vidé avec succès.');
} catch (error) {
  console.error('Erreur lors du vidage du répertoire auth_info_baileys :', error);
}

router.get("/", async (req, res) => {
  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

  async function ovls() {
    const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);
    try {
      let ovl = makeWASocket({ 
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), 
        browser: [ "Ubuntu", "Chrome", "20.0.04" ],
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({level: "silent"}).child({level: "silent"})),
        },
      });

      ovl.ev.on("connection.update", async (s) => {
    const { connection, lastDisconnect, qr } = s;
    if (qr) { 
        try {
            let qrData = await toBuffer(qr);
            let base64Image = qrData.toString('base64');
            const data = `data:image/png;base64,${base64Image}`;
            res.send(`<img src="${data}" alt="QR Code">`);
        } catch (error) {
            console.error('Erreur lors de la manipulation du QR code:', error);
            res.status(500).send('Erreur lors de la manipulation du QR code');
        }
    }
});     
        if (connection == "open"){
          await delay(3000);
          let user = ovl.user.id;

          let CREDS = fs.readFileSync('./session/creds.json');
          let ov = ovl.sendMessage(ovl.user.id, { document: CREDS, mimetype: "Application/json", fileName: "creds.json"}, { quoted: `merci d'avoir choisi ovl-Md`});

          await delay(1000);
          try {
              await fs.emptyDirSync(authInfoPath);
          } catch (e) {}
        }

        ovl.ev.on('creds.update', saveCreds);

        if (connection === "close") {            
          let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
          if (reason === DisconnectReason.connectionClosed) {
            console.log("Connection fermée");
          } else if (reason === DisconnectReason.connectionLost) {
            console.log("Connection perdue depuis le serveur !");
          } else if (reason === DisconnectReason.restartRequired) {
            console.log("Redémarrage requis, redémarrage en cours...");
            ovls().catch(err => console.log(err));
          } else if (reason === DisconnectReason.timedOut) {
            console.log("Connexion expirée !");
          }  else {
            console.log('Connexion fermée avec le bot. Veuillez exécuter à nouveau.');
            console.log(reason);
          }
        }
      });
    } catch (err) {
      console.log(err);
      await fs.emptyDirSync(authInfoPath);
    }
  }

  ovls().catch(async (err) => {
    console.log(err);
    await fs.emptyDirSync(authInfoPath);
  });
});

module.exports = router;
