const express = require('express');
// const puppeteer = require('puppeteer');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = express();
const youtubedl = require('youtube-dl-exec');
const splitTextIntoChunks = require('./generateTextAnalysis')
const transcribeAudioToText = require('./transcribeAudioToText')

app.use(express.json()); // Middleware para análise de solicitações JSON

// O código define o motor de visualização como HTML
app.set("view engine", "html");
app.engine("html", require("hbs").__express);
app.set("views", path.join(__dirname, "public/views"));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/home', (req, res) => {
  res.status(200).render("./index");
})

// Redireciona a rota raiz (/) para /payment-choice
app.get("/", (req, res) => {
  res.redirect("/home");
});

app.post('/analise-video', async (req, res) => {
  const { urlVideo } = req.body;
  console.log(urlVideo)

  const tempDir = path.resolve(__dirname, 'downloads'); // Diretório temporário
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);


  // Caminhos temporários únicos
  const audioPath = path.resolve(tempDir, 'audio.mp3');

  if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

  try {
    console.time("áudio baixado");
    await youtubedl(urlVideo, { output: audioPath, format: 'bestaudio' });
    console.timeEnd("áudio baixado");

    const transcriptionText = await transcribeAudioToText();
    const formatResponse = await splitTextIntoChunks(transcriptionText);
    console.log(formatResponse)

    res.send(formatResponse);

  } catch (error) {
    console.error(error);
  }

  try {
    // const analise = await getChatCompletion(tweets); 
  } catch (error) {
    console.error(error);
  }
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});