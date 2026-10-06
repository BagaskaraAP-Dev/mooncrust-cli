#!/usr/bin/env node

const figlet = require('figlet');
const chalk = require('chalk');
const readline = require('readline');

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.greenBright('Anda ❯ ')
});

rl.prompt();

rl.on('line', (line) => {
  const input = line.trim();
  
  if (input.toLowerCase() === 'keluar' || input.toLowerCase() === 'exit') {
    console.log(chalk.yellow('\nSampai jumpa!'));
    process.exit(0);
  }

  if (input !== '') {
    console.log(chalk.magentaBright('Mooncrust ❯ ') + chalk.white('Pesan diterima: ') + chalk.italic(input));
    console.log(chalk.gray('(Ini masih simulasi awal. Sistem AI akan segera dipasang...)'));
  }
  
  console.log();
  rl.prompt();
}).on('close', () => {
  console.log(chalk.yellow('\nSampai jumpa!'));
  process.exit(0);
});
