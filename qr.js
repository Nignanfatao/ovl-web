const fs = require("fs-extra");
const express = require("express");
let router = express.Router()
const app = express();
const pino = require("pino");
const { toBuffer } = require("qrcode");
const { Boom } = require("@hapi/boom");

const PORT = process.env.PORT || 5000;

const authInfoPath = __dirname + '/auth_info_baileys';

// Vérifier si le répertoire existe déjà
if (!fs.existsSync(authInfoPath)) {
  try {
    // Créer le répertoire
    fs.mkdirSync(authInfoPath);
    console.log('Répertoire auth_info_baileys créé avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création du répertoire auth_info_baileys :', error);
  }
} else {
  console.log('Le répertoire auth_info_baileys existe déjà.');
}

// Utilisez fs.emptyDirSync après avoir vérifié ou créé le répertoire
try {
  fs.emptyDirSync(authInfoPath);
  console.log('Contenu du répertoire auth_info_baileys vidé avec succès.');
} catch (error) {
  console.error('Erreur lors du vidage du répertoire auth_info_baileys :', error);
}

router.get("/", async (req, res) => {
  const { default: OvlWASocket, useMultiFileAuthState, Browsers, delay, DisconnectReason, makeInMemoryStore } = require("@sampandey001/baileys");

  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

  async function ovls() {
    const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);
    try {
      let ovl = OvlWASocket({ 
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), 
        browser: Browsers.baileys("Desktop"),
        auth: state 
      });

      ovl.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect, qr } = s;
        if (qr) { res.end(await toBuffer(qr)); }

        if (connection == "open"){
          await delay(3000);
          let user = ovl.user.id;

          let CREDS = fs.readFileSync(authInfoPath + '/creds.json')
          var Scan_Id = Buffer.from(CREDS).toString('base64');
          let msgsss = await ovl.sendMessage(user, { text: `Ovl;;; ${Scan_Id}` });
          await ovl.sendMessage(user, {image: {url: "https://telegra.ph/file/0d81626ca4a81fe93303a.jpg"}, caption: "Merci d'avoir choisie ovl-Md"});
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
    // MADE WITH
  });
});

module.exports = router

