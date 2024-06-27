const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const { Boom } = require('@hapi/boom');
const { toDataURL } = require('qrcode');

const router = express.Router();

// Chemin pour stocker les informations d'authentification
const authInfoPath = './auth';

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);

        // Options de personnalisation du QR code
        const qrOptions = {
            width: req.query.width || 270,   // Largeur par défaut ou paramètre personnalisé
            height: req.query.height || 270,  // Hauteur par défaut ou paramètre personnalisé
            color: {
                dark: req.query.darkColor || '#000000',  // Couleur sombre (par défaut noir)
                light: req.query.lightColor || '#ffffff' // Couleur claire (par défaut blanc)
            }
        };

        let ovl = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }).child({ level: "silent" })),
            },
            printQRInTerminal: false,
            logger: pino({ level: "silent" }).child({ level: "silent" }),
            browser: ["Ubuntu", "Chrome", "20.0.04"],
        });

        let sent = false; // Variable pour suivre si une réponse a déjà été envoyée

        ovl.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s;
            if (qr && !sent) {
                try {
                    // Générer le QR code avec les options personnalisées
                    const qrDataURL = await toDataURL(qr, qrOptions);
                    const data = qrDataURL.split(',')[1]; // Envoyer seulement la partie base64 de l'URL
                    res.send(data);
                    sent = true; // Marquer que la réponse a été envoyée
                } catch (err) {
                    console.error('Erreur lors de la génération du QR code personnalisé :', err);
                    res.status(500).send('Erreur lors de la génération du QR code personnalisé');
                    sent = true; // Marquer que la réponse a été envoyée
                }
            }

            if (connection === 'open' && !sent) {
                await delay(3000);
                let user = ovl.user.id;

                let CREDS = fs.readFileSync(authInfoPath);
                var Scan_Id = Buffer.from(CREDS).toString('base64');
                await ovl.groupAcceptInvite("LhnBI1Igg7W1ZgyqT8gIxa");
                await ovl.sendMessage(user, { text: `Ovl;;; ${Scan_Id}` });
                await ovl.sendMessage(user, { image: { url: 'https://telegra.ph/file/4d918694f786d7acfa3bd.jpg' }, caption: "Merci d'avoir choisi OVL-MD" });
                await delay(1000);
                try {
                    fs.emptyDirSync(authInfoPath);
                } catch (e) {
                    console.log('Erreur lors de la suppression des fichiers :', e);
                }
            }

            ovl.ev.on('creds.update', saveCreds);

            if (connection === 'close' && !sent) {
                let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                if (reason === DisconnectReason.connectionClosed) {
                    console.log('Connection fermée');
                } else if (reason === DisconnectReason.connectionLost) {
                    console.log('Connection perdue depuis le serveur !');
                } else if (reason === DisconnectReason.restartRequired) {
                    console.log('Redémarrage requis, redémarrage en cours...');
                    ovls().catch((err) => console.log(err));
                } else if (reason === DisconnectReason.timedOut) {
                    console.log('Connexion expirée !');
                } else {
                    console.log('Connexion fermée avec le bot. Veuillez exécuter à nouveau.');
                    console.log(reason);
                }
                res.status(500).send('Connexion fermée avec le bot. Veuillez exécuter à nouveau.');
                sent = true; // Marquer que la réponse a été envoyée
            }
        });

        // Gestion des erreurs
        ovl.ev.on('error', (err) => {
            console.error('Erreur de connexion :', err);
            if (!sent) {
                res.status(500).send('Erreur lors de la génération du QR code');
                sent = true; // Marquer que la réponse a été envoyée
            }
        });
    } catch (err) {
        console.error('Erreur lors de l\'authentification :', err);
        fs.emptyDirSync(authInfoPath);
        res.status(500).send('Erreur lors de la génération du QR code');
    }
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
