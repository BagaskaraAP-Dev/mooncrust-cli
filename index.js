#!/usr/bin/env node

const figlet = require('figlet');
const chalk = require('chalk');
const readline = require('readline');

// Menampilkan Logo
console.clear();
console.log(
  chalk.cyanBright(
    figlet.textSync('MOONCRUST', {
      font: 'Slant',
      horizontalLayout: 'controlled smushing'
    })
  )
);
console.log(chalk.gray('======================================================================'));
console.log(chalk.bold.white('Selamat datang di Mooncrust CLI!'));
console.log(chalk.gray('Ketik "keluar" atau "exit" untuk mengakhiri sesi.'));
console.log(chalk.gray('======================================================================\n'));

// Membuat antarmuka input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.greenBright('Anda ❯ ')
});

rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  
  if (input.toLowerCase() === 'keluar' || input.toLowerCase() === 'exit') {
    console.log(chalk.yellow('\nSampai jumpa!'));
    process.exit(0);
  }

  if (input !== '') {
    process.stdout.write(chalk.magentaBright('\nMooncrust ❯ '));

    try {
      const response = await fetch('https://mooncrust.my.id/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: input }],
          model: 'mc-pro'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                process.stdout.write(chalk.white(data.text));
              }
            } catch (e) {
              // Abaikan jika JSON terpotong di tengah stream
            }
          }
        }
      }
      console.log('\n');

    } catch (error) {
      console.log(chalk.red('\n[Gagal terhubung ke API Mooncrust: ' + error.message + ']'));
      console.log('\n');
    }
  }
  
  rl.prompt();
}).on('close', () => {
  console.log(chalk.yellow('\nSampai jumpa!'));
  process.exit(0);
});
