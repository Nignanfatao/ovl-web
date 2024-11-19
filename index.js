const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 8000;
let code = require('./pair');
const router = require('./qr');

require('events').EventEmitter.defaultMaxListeners = 500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/code', code);
app.use('/qr', router);

app.use('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

app.use('/qrcode', (req, res) => {
    res.sendFile(path.join(__dirname, 'qr.html'));
});

app.use('/deploy', (req, res) => {
    res.sendFile(path.join(__dirname, 'deploy.html'));
});

app.use('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});

module.exports = app;
