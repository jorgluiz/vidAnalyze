import http from "http";
import express from 'express'
const app = express();
import dotenv from "dotenv";
dotenv.config();
import fs from 'fs'
import path from 'path'
import hbs from "hbs";
import youtubedl from 'youtube-dl-exec'
import splitTextIntoChunks from './generateTextAnalysis.js'
import transcribeAudioToText from './transcribeAudioToText.js'
import * as logger from "./utils/logger.js";

app.use(express.json()); // Middleware para análise de solicitações JSON
const server = http.createServer(app);

// Configuração do Handlebars para renderizar HTML
app.engine("html", hbs.__express);
app.set("view engine", "html");
app.set("views", path.join(path.resolve(), "public/views"));

// Configuração para arquivos estáticos
app.use(express.static(path.join(path.resolve(), "public")));

// app.set("view engine", "html");
// app.engine("html", require("hbs").__express);
// app.set("views", path.join(__dirname, "public/views"));
// app.use(express.static(path.join(__dirname, 'public')));

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

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
