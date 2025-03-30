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

const app = express();
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

app.get('/pair', async (req, res) => {
  let num = req.query.number;

  if (!num) return res.json({ error: 'Veuillez fournir un numéro de téléphone' });

  try {
    const code = await ovlPair(num);
    res.json({ code: code });
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
          console.log('Connecté aux serveurs WhatsApp');
          supprimerDossierSession();
          process.send('reset');
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
    } catch (error) {
      console.error('Une erreur est survenue :', error);
      reject(new Error('Échec de la connexion'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`API en cours d’exécution sur le port : ${PORT}`);
});
