#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const figlet = require('figlet');
const chalk = require('chalk');
const readline = require('readline');
const { version } = require('./package.json');

const USAGE = [
  'Penggunaan:',
  '  mooncrust                              Mode interaktif',
  '  mooncrust "pesan"                      Kirim satu pesan lalu keluar',
  '  mooncrust --file <path> "pesan"        Sertakan isi file ke dalam pesan',
  '',
  'Opsi:',
  '  -f, --file <path>   File yang isinya disertakan ke dalam pesan',
  '  -v, --version       Tampilkan versi',
  '  -h, --help          Tampilkan bantuan ini'
].join('\n');

// Membaca argumen CLI
function parseArgs(argv) {
  const args = { file: null, help: false, version: false, prompt: [] };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      args.help = true;
    } else if (arg === '-v' || arg === '--version') {
      args.version = true;
    } else if (arg === '-f' || arg === '--file') {
      if (i + 1 >= argv.length) {
        throw new Error(`Opsi ${arg} membutuhkan path file.`);
      }
      args.file = argv[++i];
    } else if (arg.startsWith('--file=')) {
      args.file = arg.slice('--file='.length);
    } else {
      args.prompt.push(arg);
    }
  }

  args.prompt = args.prompt.join(' ').trim();
  return args;
}

const CONNECT_TIMEOUT_MS = 30000;

// Menerjemahkan error jaringan menjadi pesan yang mudah dipahami
function describeError(error) {
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return 'Server tidak merespons dalam 30 detik. Periksa koneksi Anda atau coba lagi nanti.';
  }

  switch (error.cause && error.cause.code) {
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return 'Tidak ada koneksi internet. Periksa jaringan Anda.';
    case 'ECONNREFUSED':
      return 'Koneksi ke server ditolak. Server mungkin sedang tidak aktif.';
    case 'ECONNRESET':
      return 'Koneksi ke server terputus.';
    case 'ETIMEDOUT':
    case 'UND_ERR_CONNECT_TIMEOUT':
      return 'Koneksi ke server habis waktu. Periksa jaringan Anda.';
    default:
      return 'Gagal terhubung ke API Mooncrust: ' + error.message;
  }
}

// Mengirim percakapan ke API, menulis balasan secara streaming ke terminal,
// lalu mengembalikan teks balasan lengkap
async function streamChat(messages) {
  // Batas waktu hanya berlaku sampai server mulai merespons, bukan selama streaming
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  let response;
  try {
    response = await fetch('https://mooncrust.my.id/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        model: 'mc-pro'
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  // Menyimpan baris yang belum lengkap sampai chunk berikutnya tiba
  let buffer = '';
  let reply = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      reply += handleLine(buffer);
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      reply += handleLine(line);
    }
  }

  return reply;
}

// Memproses satu baris SSE dan mengembalikan teks balasan di dalamnya
function handleLine(rawLine) {
  const line = rawLine.replace(/\r$/, '');

  if (line.startsWith('data: ') && line !== 'data: [DONE]') {
    try {
      const data = JSON.parse(line.slice(6));
      if (data.text) {
        process.stdout.write(chalk.white(data.text));
        return data.text;
      } else if (data.error) {
        process.stdout.write(chalk.red(`[Server: ${data.error}]`));
      }
    } catch (e) {
      // Abaikan baris yang bukan JSON valid
    }
  }

  return '';
}

// Mode one-liner: kirim satu pesan, tulis balasan, lalu keluar
async function runOnce(args) {
  let content = args.prompt;

  if (args.file) {
    const filePath = path.resolve(args.file);
    let fileContent;

    try {
      fileContent = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      const reason = error.code === 'ENOENT' ? 'file tidak ditemukan' : error.message;
      console.error(chalk.red(`[Gagal membaca file ${args.file}: ${reason}]`));
      process.exit(1);
    }

    content = `${args.prompt}\n\nIsi file ${path.basename(filePath)}:\n${fileContent}`;
  }

  try {
    await streamChat([{ role: 'user', content }]);
    process.stdout.write('\n');
    process.exitCode = 0;
  } catch (error) {
    console.error(chalk.red('\n[' + describeError(error) + ']'));
    process.exitCode = 1;
  }
}

// Mode interaktif
function runInteractive() {
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

  // Riwayat percakapan selama sesi berlangsung
  const history = [];

  // Input diproses berurutan, sehingga "exit" menunggu balasan yang sedang berjalan
  let queue = Promise.resolve();

  const quit = () => {
    console.log(chalk.yellow('\nSampai jumpa!'));
    process.exit(0);
  };

  rl.prompt();

  rl.on('line', (line) => {
    queue = queue.then(() => handleInput(line));
  }).on('close', () => {
    queue.then(quit);
  }).on('SIGINT', quit);

  async function handleInput(line) {
    const input = line.trim();

    if (input.toLowerCase() === 'keluar' || input.toLowerCase() === 'exit') {
      quit();
    }

    if (input !== '') {
      process.stdout.write(chalk.magentaBright('\nMooncrust ❯ '));

      history.push({ role: 'user', content: input });

      try {
        const reply = await streamChat(history);
        if (reply) {
          history.push({ role: 'assistant', content: reply });
        } else {
          // Server tidak mengirim balasan, misalnya karena error di sisi server
          history.pop();
        }
        console.log('\n');
      } catch (error) {
        // Pesan yang gagal dikirim tidak disimpan ke riwayat
        history.pop();
        console.log(chalk.red('\n[' + describeError(error) + ']'));
        console.log('\n');
      }
    }

    rl.prompt();
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(chalk.red(error.message));
    console.error(USAGE);
    process.exit(1);
  }

  if (args.help) {
    console.log(USAGE);
    return;
  }

  if (args.version) {
    console.log(`mooncrust ${version}`);
    return;
  }

  if (args.file && !args.prompt) {
    console.error(chalk.red('Pesan wajib diisi saat menggunakan --file.'));
    console.error(USAGE);
    process.exit(1);
  }

  if (args.prompt) {
    runOnce(args);
  } else {
    runInteractive();
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, describeError, handleLine };
