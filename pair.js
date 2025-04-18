const express = require('express');
const axios = require('axios');  
const fs = require('fs');
const pino = require("pino");
const { Boom } = require('@hapi/boom');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("ovl_wa_baileys");

const app = express.Router();
const PORT = process.env.PORT || 3000;

function genererIdAleatoire() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return id;
}

let dossierSession = `./sessionpair/${genererIdAleatoire()}`;
if (fs.existsSync(dossierSession)) {
  try {
    fs.rmdirSync(dossierSession, { recursive: true });
    console.log('Dossier SESSION supprimé.');
  } catch (err) {
    console.error('Erreur lors de la suppression du dossier SESSION :', err);
  }
}
try {
  fs.mkdirSync(dossierSession, { recursive: true });
  console.log('Dossier SESSION recréé avec le même ID.');
} catch (err) {
  console.error('Erreur lors de la création du dossier SESSION :', err);
}

function supprimerDossierSession() {
  if (!fs.existsSync(dossierSession)) {
    console.log('Le dossier SESSION n’existe pas.');
    return;
  }
  try {
    fs.rmdirSync(dossierSession, { recursive: true });
    console.log('Dossier SESSION supprimé.');
  } catch (err) {
    console.error('Erreur lors de la suppression du dossier SESSION :', err);
  }
}

app.get('/', async (req, res) => {
  let num = req.query.number;

  if (!num) return res.json({ error: 'Veuillez fournir un numéro de téléphone' });

  try {
    const code = await ovlPair(num);
    res.send({ code: code });
  } catch (error) {
    console.error('Erreur d’authentification WhatsApp :', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

async function ovlPair(num) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(dossierSession)) {
        await fs.mkdirSync(dossierSession);
      }

      const { state, saveCreds } = await useMultiFileAuthState(dossierSession);
      const ovl = makeWASocket({
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        auth: state,
      });

      if (!ovl.authState.creds.registered) {
        let numero = num.replace(/[^0-9]/g, '');
        setTimeout(async () => {
          try {
            let code = await ovl.requestPairingCode(numero);
            console.log(`Code de jumelage : ${code}`);
            resolve(code);
          } catch (error) {
            console.error('Erreur lors de la demande du code de jumelage :', error);
            reject(new Error('Échec de la demande du code de jumelage'));
          }
        }, 2000);
      }

      ovl.ev.on('creds.update', saveCreds);
      ovl.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
 
        if (connection === 'open') {
          await delay(10000);
          let utilisateur = ovl.user.id;
          let CREDS = fs.readFileSync(`${dossierSession}/creds.json`, 'utf-8');

          try {
            const reponse = await axios.post(
              'https://pastebin.com/api/api_post.php',
              new URLSearchParams({
                api_dev_key: '64TBS-HKyH1n5OL2ddx7DwtpOKMsRDXl',
                api_option: 'paste',
                api_paste_code: CREDS,
                api_paste_expire_date: 'N'
              }),
              { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const lienPastebin = reponse.data.split('/')[3];
            await delay(2000);
            console.log(`Numéro de téléphone : ${num}\nSESSION-ID : Ovl-MD_${lienPastebin}_SESSION-ID\nLien Pastebin : ${reponse.data}`);

            let messageSession = await ovl.sendMessage(utilisateur, { text: `Ovl-MD_${lienPastebin}_SESSION-ID` });
            await delay(2000);
            await ovl.sendMessage(utilisateur, {
              image: { url: 'https://telegra.ph/file/4d918694f786d7acfa3bd.jpg' },
              caption: "Merci d’avoir choisi OVL-MD, voici votre SESSION-ID ⏏️"
            }, { quoted: messageSession });

            console.log('Connecté aux serveurs WhatsApp');

            try {
              supprimerDossierSession();
            } catch (erreur) {
              console.error('Erreur lors de la suppression du dossier de session :', erreur);
            }

            process.send?.('reset');
          } catch (erreur) {
            console.error('Erreur lors de la création de la session :', erreur);
          }
        }

        if (connection === 'close') {
          let raison = new Boom(lastDisconnect?.error)?.output.statusCode;
          switch (raison) {
            case DisconnectReason.connectionClosed:
              console.log('Connexion fermée, reconnexion en cours...');
              process.send('reset');
              break;
            case DisconnectReason.connectionLost:
              console.log('Connexion perdue avec le serveur, reconnexion...');
              process.send('reset');
              break;
            case DisconnectReason.loggedOut:
              console.log('Déconnecté, veuillez vous reconnecter...');
              supprimerDossierSession();
              process.send('reset');
              break;
            case DisconnectReason.restartRequired:
              console.log('Redémarrage requis...');
              ovlPair();
              break;
            case DisconnectReason.timedOut:
              console.log('Temps de connexion écoulé, tentative de reconnexion...');
              process.send('reset');
              break;
            case DisconnectReason.badSession:
              console.log('Session invalide, reconnexion en cours...');
              supprimerDossierSession();
              process.send('reset');
              break;
            case DisconnectReason.connectionReplaced:
              console.log('Connexion remplacée, tentative de reconnexion...');
              process.send('reset');
              break;
            default:
              console.log('Déconnecté du serveur. Veuillez vérifier votre compte WhatsApp.');
              process.send('reset');
          }
        }
      });
    ovl.ev.on('messages.upsert', () => {});
    } catch (error) {
      console.error('Une erreur est survenue :', error);
      reject(new Error('Échec de la connexion'));
    }
  });
}

module.exports = app;
