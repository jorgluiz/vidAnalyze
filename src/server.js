const express = require('express');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteer = require('puppeteer-extra');
// const puppeteer = require('puppeteer');
require('dotenv').config();
const fs = require('fs');
const archiver = require('archiver');
const unzipper = require('unzipper');
const path = require('path');
const open = require('open');

const admin = require('firebase-admin');

puppeteer.use(StealthPlugin());

const app = express();
const { scrollPage } = require('./scrollPage');
const { getChatCompletion } = require('./sentimentOpenai');

// O código define o motor de visualização como HTML
app.set("view engine", "html");
app.engine("html", require("hbs").__express);
app.set("views", path.join(__dirname, "public/views"));

app.get('/home', (req, res) => {
  res.status(200).render("./index");
})

// Redireciona a rota raiz (/) para /payment-choice
app.get("/", (req, res) => {
  res.redirect("/home");
});


// Inicializar o Firebase Admin SDK
const { firebaseConfig } = require('./firebaseConfig')
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  storageBucket: `${process.env.FIREBASE_STORAGE_BUCKET}.appspot.com`
});

const bucket = admin.storage().bucket();

const saveBrowserProfile = async () => {
  try {
    const profilePath = path.join(__dirname, 'CustomProfile');
    const zipPath = path.join(__dirname, 'CustomProfile.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      console.log('Perfil do navegador compactado');

      // Enviar o arquivo compactado para o Firebase Storage
      await bucket.upload(zipPath, {
        destination: 'CustomProfile.zip'
      });

      console.log('Perfil do navegador salvo no Firebase Storage');
      fs.unlinkSync(zipPath); // Remover o arquivo zip após o envio
    });

    archive.pipe(output);
    archive.directory(profilePath, false);
    await archive.finalize();
  } catch (error) {
    console.error(error);
  }
};

saveBrowserProfile()

app.get('/', async (req, res) => {

  try {
    const restorePath = path.join(__dirname, 'CustomProfile');
    const zipPath = path.join(__dirname, 'CustomProfile.zip');

    // Baixar o arquivo do Firebase Storage
    await bucket.file('CustomProfile.zip').download({ destination: zipPath });
    console.log('Perfil do navegador recuperado do Firebase Storage');

    // Descompactar o arquivo
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: restorePath }))
      .on('close', async () => {
        console.log('Perfil do navegador restaurado');
        fs.unlinkSync(zipPath);

        // Use o perfil restaurado com o Puppeteer
        const browser = await puppeteer.launch({
          headless: true, // Define se o navegador deve rodar em modo headless (sem interface gráfica). No caso de servidores, geralmente é true
          defaultViewport: null, // Define a viewport padrão como null, o que permite que o navegador use o tamanho de viewport do sistema ou da última sessão.
          args: [
            '--no-sandbox', // Executa o Chromium sem sandboxing, necessário para que funcione em ambientes restritos como o Heroku.
            '--disable-setuid-sandbox', // Desativa o setuid sandboxing, uma opção adicional para ambientes onde o sandboxing tradicional não é possível.
            '--disable-dev-shm-usage', // Usa /tmp ao invés de /dev/shm, útil em ambientes com pouca memória compartilhada.
            '--disable-accelerated-2d-canvas', // Desativa a aceleração de canvas 2D, o que pode melhorar a estabilidade em ambientes headless.
            '--no-first-run', // Ignora a mensagem de "primeira execução" do Chrome, acelerando o tempo de inicialização.
            '--no-zygote', // Desativa o processo zygote, usado no Chromium para gerenciar processos filhos de forma eficiente, reduzindo o overhead.
            '--single-process', // Executa tudo em um único processo, o que pode ser útil em ambientes restritos em termos de recursos.
            '--disable-gpu' // Desativa a renderização via GPU, geralmente desnecessária em ambientes headless.
          ],
          userDataDir: restorePath  // Define o diretório de dados do usuário como o caminho restaurado, garantindo que o perfil do navegador recuperado seja usado.
        });

        const page = await browser.newPage();

        // Navegar para o perfil do Twitter
        await page.goto('https://x.com/CNNBrasil', { waitUntil: 'networkidle2' });

        // Função para capturar tweets
        const captureTweets = async () => {
          console.log('Capturando tweets...');

          // Obter tweets da página
          return await page.evaluate(() => {
            const tweetElements = document.querySelectorAll('article');
            const tweetData = [];

            tweetElements.forEach(tweet => {
              try {
                const content = tweet.querySelector('div[lang]')?.innerText || '';
                const timestamp = tweet.querySelector('time')?.getAttribute('datetime') || '';
                const replies = tweet.querySelector('[data-testid="reply"] span')?.innerText || '0';
                const retweets = tweet.querySelector('[data-testid="retweet"] span')?.innerText || '0';
                const likes = tweet.querySelector('[data-testid="like"] span')?.innerText || '0';
                const viewElements = Array.from(tweet.querySelectorAll('span.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3'))
                  .map(el => el.innerText);
                let views = '0';
                if (viewElements.length > 0) {
                  views = viewElements[viewElements.length - 1];
                  if (views === likes) {
                    views = '0';
                  }
                }
                tweetData.push({ content, timestamp, replies, retweets, likes, views });
              } catch (error) {
                console.error('Erro ao processar um tweet:', error);
              }
            });

            return tweetData;
          });
        };

        try {
          await scrollPage(page); // Primeiro, rolamos a página
          await page.waitForSelector('article', { timeout: 10000 }); // Esperar os tweets carregarem (ajuste o seletor conforme necessário)
          const tweets = await captureTweets(); // Depois, capturamos os tweets
          getChatCompletion(tweets); // Enviamos os tweets para análise de sentimento
          // console.log(tweets);
          res.json({ messages: tweets })
        } catch (error) {
          console.error('Erro ao capturar tweets:', error);
          res.status(500).json({ error: 'Erro ao capturar tweets' });
        } finally {
          await browser.close(); // Certifique-se de fechar o navegador após o uso
        }
      });
  } catch (error) {
    console.error(error);
  }
})

// app.listen(3000, () => {
//   console.log('Server is running on port 3000')
// })

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`The server is now running on port ${PORT}`);
  open(`http://localhost:${PORT}`);
})