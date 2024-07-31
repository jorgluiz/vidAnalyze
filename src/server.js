const express = require('express');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteer = require('puppeteer-extra');
// const puppeteer = require('puppeteer');
require('dotenv').config();
const fs = require('fs');
const { MongoClient, GridFSBucket  } = require('mongodb');
const archiver = require('archiver');
const unzipper = require('unzipper');
const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
const { scrollPage } = require('./scrollPage');
const { getChatCompletion } = require('./sentiment');

// const saveBrowserProfile = async () => {
//     const client = new MongoClient(process.env.MONGO_URI);
//     try {
//       await client.connect();
//       const db = client.db('mydatabase');
//       const bucket = new GridFSBucket(db);
  
//       // Compactar o diretório do perfil do navegador
//       const profilePath = path.join(__dirname, 'CustomProfile');
//       const zipPath = path.join(__dirname, 'CustomProfile.zip');
//       const output = fs.createWriteStream(zipPath);
//       const archive = archiver('zip', { zlib: { level: 9 } });
  
//       output.on('close', () => {
//         console.log('Perfil do navegador compactado');
  
//         // Enviar o perfil compactado para o MongoDB
//         const stream = fs.createReadStream(zipPath).pipe(bucket.openUploadStream('CustomProfile.zip'));
//         stream.on('finish', () => {
//           console.log('Perfil do navegador salvo no MongoDB');
//           fs.unlinkSync(zipPath); // Remover o arquivo zip após envio
//         });
//       });
  
//       archive.pipe(output);
//       archive.directory(profilePath, false);
//       await archive.finalize();
//     } catch (error) {
//       console.error(error);
//     } finally {
//       await client.close();
//     }
//   };
  
//   // Salvar o perfil ao iniciar o servidor (apenas como exemplo)
//   saveBrowserProfile();
  

 app.get('/', (req, res) => {
    const restoreBrowserProfile = async () => {
        const client = new MongoClient(process.env.MONGO_URI);
        try {
            await client.connect();
                  const db = client.db('mydatabase');
                  const bucket = new GridFSBucket(db);
    
          // Caminho para o diretório onde o perfil será restaurado
          const restorePath = path.join(__dirname, 'CustomProfile');
      
          // Recuperar o arquivo compactado do MongoDB
          const downloadStream = bucket.openDownloadStreamByName('CustomProfile.zip');
          const zipPath = path.join(__dirname, 'CustomProfile.zip');
      
          // Salvar o arquivo compactado localmente
          const output = fs.createWriteStream(zipPath);
          downloadStream.pipe(output);
      
          output.on('finish', async () => {
            console.log('Perfil do navegador recuperado do MongoDB');
      
            // Descompactar o arquivo
            fs.createReadStream(zipPath)
              .pipe(unzipper.Extract({ path: restorePath }))
              .on('close', () => {
                console.log('Perfil do navegador restaurado');
                fs.unlinkSync(zipPath); // Remover o arquivo zip após descompactar
      
                // Use o perfil restaurado com o Puppeteer
                (async () => {
                  const browser = await puppeteer.launch({
                    headless: true, // Modo headless para servidores
                    defaultViewport: null,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ],
                    userDataDir: restorePath  // Diretório onde o perfil foi restaurado
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
                    console.log(tweets);
                  } catch (error) {
                    console.error('Erro ao capturar tweets:', error);
                  } finally {
                    // await browser.close();
                  }
                })();
              });
          });
        } catch (error) {
          console.error(error);
        } finally {
        //   await client.close();
        }
      };
      
      // Restaurar o perfil ao iniciar o servidor
      restoreBrowserProfile();
 })
  

app.listen(3000, () => {
    console.log('Server is running on port 3000')
})