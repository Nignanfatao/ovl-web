const express = require('express');
const app = express();
const path = require('path');
const { exec } = require('child_process');
const PORT = process.env.PORT || 8000;
let code = require('./pair');
const router = require('./qr');

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

app.use('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});

setInterval(() => {
    console.log("🔄 Exécution de 'pm2 restart all'...");
    exec('pm2 restart all', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Erreur : ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ stderr: ${stderr}`);
            return;
        }
        console.log(`✅ stdout: ${stdout}`);
    });
}, 1800000);

module.exports = app;
