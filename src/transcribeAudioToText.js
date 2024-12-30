import fs from "fs"
import path from "path"
import OpenAI from "openai"
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function transcribeAudioToText() {
  const filePath = path.join(__dirname, "./downloads/audio.mp3");

  const audioStream = fs.createReadStream(filePath);

  console.time("speech-to-text");
  const transcription = await openai.audio.transcriptions.create({
    file: audioStream,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"]
  });
  console.timeEnd("speech-to-text");

  return transcription.text
  // console.log(transcription.text);
  // const analise = await splitTextIntoChunks(transcription.text)
}

