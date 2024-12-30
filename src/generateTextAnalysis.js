import OpenAI from "openai"
import dotenv from "dotenv"
dotenv.config();

const newObject = {
  role: "system",
  content: "Resumo sobre o que texto aborda, o que texto destaca e se hover agluma solução"
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAX_TOKENS = 1024; // Defina um limite seguro para cada bloco (ajuste conforme necessário).

function splitText(text, maxTokens) {
  const parts = [];
  let currentPart = "";

  text.split(" ").forEach(word => {
    if ((currentPart + word).length > maxTokens) {
      parts.push(currentPart.trim());
      currentPart = word + " ";
    } else {
      currentPart += word + " ";
    }
  });

  if (currentPart.trim().length > 0) {
    parts.push(currentPart.trim());
  }

  return parts;
}

// Divide o texto em blocos menores para respeitar o limite de tokens.
export default async function splitTextIntoChunks(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const transcribedVideo = data;
      const parts = splitText(transcribedVideo, MAX_TOKENS);

      let finalResponse = "";

      for (const part of parts) {
        const updatedArray = [
          newObject,
          {
            role: "user",
            content: part
          }
        ];

        const response
          = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: updatedArray
          });

        const content = response.choices[0].message.content;
        finalResponse += content + "\n"; // Concatena as respostas
      }

      resolve(finalResponse.trim());
    } catch (error) {
      console.error("Erro na solicitação para a API:", error);
      reject(error);  // Rejeita a Promise com o erro
    }
  })
}