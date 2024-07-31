const express = require('express');
const puppeteer = require('puppeteer');
require('dotenv').config();
const app = express();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
    // Função para rolar a página em incrementos aleatórios
    const scrollPage = async (page) => {
      const totalHeight = await page.evaluate('document.body.scrollHeight');
      let currentHeight = 0;
      let scrollCount = 0;

      while (currentHeight < totalHeight && scrollCount < 8) {
        // const scrollHeight = Math.floor(Math.random() * (300 - 200 + 1)) + 200; // Valor aleatório entre 200px e 300px
        const scrollHeight = Math.floor(Math.random() * (700 - 600 + 1)) + 600; // Valor aleatório entre 460px e 500px
        currentHeight += scrollHeight;
        await page.evaluate(`window.scrollBy(0, ${scrollHeight})`);
        console.log(`Rolando ${scrollHeight}px...`);
        await sleep(Math.floor(Math.random() * (800 - 500 + 1)) + 500); // Pausa de 190 milissegundos entre as rolagens
        scrollCount++;
      }
    };


module.exports = { scrollPage }