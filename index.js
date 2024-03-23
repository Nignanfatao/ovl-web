const express = require('express');
const { toBuffer } = require('qrcode');
const app = express();
__path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let code = require('./pair');
let ovl = require('./qr');
require('events').EventEmitter.defaultMaxListeners = 500;
const fs = require("fs-extra");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/recupererQRCode", async (req, res) => {
    ovl.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect, qr } = s;
        if (qr) { 
            try {
                let qrData = await toBuffer(qr);
                const qrCodeData = qrData.toString('base64');
                res.send(qrCodeData);
            } catch (error) {
                console.error("Erreur lors de la génération du code QR :", error);
                res.status(500).send("Erreur Interne du Serveur");
            }
        }
    });
});

app.use('/code', code);

app.use('/pair', async (req, res, next) => {
    res.sendFile(__path + '/pair.html');
});

app.use('/qr', async (req, res, next) => {
    res.sendFile(__path + '/qr.html');
});

app.use('/deploy', async (req, res, next) => {
    res.sendFile(__path + '/deploy.html');
});

app.use('/', async (req, res, next) => {
    res.sendFile(__path + '/main.html');
});

app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});

module.exports = app;
