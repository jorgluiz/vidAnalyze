const OpenAI = require("openai");
require('dotenv').config();

const newObject = {
  role: "system",
  content: "Resumo sobre o que texto aborda, o que texto destaca e se hover agluma solução"
};

// const tweets = [
//   {
//     role: "system",
//     content: "Coletar dados de mídias sociais para análise de sentimentos e tendencias. positiva, negativa e neutra"
//   }
//   {
//     role: "user",
//     content: '"Mercado saturado": dentista diz que ganha quase R$ 1 mil a mais como motogirl e viraliza no TikTok https://cnnbrasil.com.br/economia/macroeconomia/mercado-saturado-dentista-diz-que-ganha-r-1-mil-a-mais-como-motogirl-e-viraliza-no-tiktok/?utm_source=social&utm_medium=twitt…...',
//     timestamp: '2024-07-25T10:31:06.000Z',
//     replies: '2',
//     retweets: '0',
//     likes: '11',
//     views: '2K'
//   },
//   {
//     role: "user",
//     content: 'Isis-K amplia recrutamento de adolescentes e ameaça segurança do Ocidente',
//     timestamp: '2024-07-25T10:23:25.000Z',
//     replies: '3',
//     retweets: '1',
//     likes: '7',
//     views: '2.7K'
//   },
//   {
//     role: "user",
//     content: 'A Polícia Federal (PF) foi acionada na quarta-feira (24), para investigar a suspeita de um ataque hacker ao Sistema Eletrônico de Informações (SEI) do governo federal. Pelo menos nove ministérios foram afetados. #CNNNovoDia',
//     timestamp: '2024-07-25T10:20:56.000Z',
//     replies: '4',
//     retweets: '3',
//     likes: '24',
//     views: '3K'
//   },
//   {
//     role: "user",
//     content: 'Uma nova pesquisa da CNN, conduzida pela SSRS, indica um empate técnico entre Kamala Harris e Donald Trump em intenções de voto para as eleições presidenciais de 2024. O levantamento mostra Trump com 49% das intenções entre eleitores registrados, e Kamala com 46%. #CNNNovoDia',
//     timestamp: '2024-07-25T10:17:12.000Z',
//     replies: '18',
//     retweets: '6',
//     likes: '16',
//     views: '3.4K'
//   },
//   {
//     role: "user",
//     content: 'Em uma publicação em sua rede social, o ex-presidente Donald Trump reagiu ao pronunciamento de Joe Biden. O republicano disse que a fala de Biden foi "quase incompreensível". #CNNNovoDia',
//     timestamp: '2024-07-25T10:13:38.000Z',
//     replies: '4',
//     retweets: '2',
//     likes: '15',
//     views: '3.5K'
//   },
//   {
//     role: "user",
//     content: 'O presidente dos Estados Unidos Joe Biden fez um pronunciamento em horário nobre direto do salão oval da Casa Branca sobre a decisão de abandonar a corrida eleitoral. Ele disse que era o momento de dar lugar a uma nova geração.  #CNNNovoDia',
//     timestamp: '2024-07-25T10:10:06.000Z',
//     replies: '2',
//     retweets: '1',
//     likes: '15',
//     views: '3.6K'
//   }
// ];


//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


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
module.exports = async function splitTextIntoChunks(data) {
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