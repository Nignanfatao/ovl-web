const express = require('express');
const { toBuffer } = require('qrcode');
const app = express();
__path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let code = require('./pair');
//let qr = require('./qr');
require('events').EventEmitter.defaultMaxListeners = 500;
// const express = require("express");
//const router = express.Router();
const fs = require("fs-extra");
const { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason, makeInMemoryStore } = require("@whiskeysockets/baileys");
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

app.use("/recupererQRCode", async (req, res) => {
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
          let qrData = await toBuffer(qr);
          res.send(qrData.toString('base64'));
        }
        
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
app.use('/code', code);
/*app.use('/qr-code', async (req, res) => {
 // const r = qr; // Remplacez par votre texte ou vos données réelles
  const qrCodeBuffer = await toBuffer(qr);
  const qrCodeData = qrCodeBuffer.toString('base64');
  res.send(qrCodeData);
});*/
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});

app.use('/pair',async (req, res, next) => {
res.sendFile(__path + '/pair.html')
});
app.use('/qr' ,async (req, res, next) => {
res.sendFile(__path + '/qr.html')
});
app.use('/deploy',async (req, res, next) => {
res.sendFile(__path + '/deploy.html')
});
app.use('/',async (req, res, next) => {
res.sendFile(__path + '/main.html')
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:` + PORT)
});

module.exports = app
