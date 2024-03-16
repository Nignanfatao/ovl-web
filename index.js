const express = require('express');
const { toBuffer } = require('qrcode');
const app = express();
__path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let code = require('./pair');
let qr = require('/qr');
require('events').EventEmitter.defaultMaxListeners = 500;
app.use('/code', code);
app.get('/qr-code', async (req, res) => {
 // const r = qr; // Remplacez par votre texte ou vos données réelles
  const qrCodeBuffer = await toBuffer(qr);
  const qrCodeData = qrCodeBuffer.toString('base64');
  res.send(qrCodeData);
});

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
