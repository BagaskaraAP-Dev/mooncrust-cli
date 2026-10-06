const test = require('node:test');
const assert = require('node:assert');
const { parseArgs, describeError, handleLine } = require('../index.js');

function networkError(code) {
  return Object.assign(new Error('fetch failed'), { cause: { code } });
}

// Menjalankan fn tanpa menulis ke terminal
function silenced(fn) {
  const write = process.stdout.write;
  process.stdout.write = () => true;
  try {
    return fn();
  } finally {
    process.stdout.write = write;
  }
}

test('parseArgs: tanpa argumen berarti mode interaktif', () => {
  assert.deepStrictEqual(parseArgs([]), { file: null, help: false, version: false, prompt: '' });
});

test('parseArgs: beberapa argumen digabung menjadi satu pesan', () => {
  assert.strictEqual(parseArgs(['Halo', 'apa', 'kabar']).prompt, 'Halo apa kabar');
});

test('parseArgs: --file, -f, dan --file= dibaca sebagai path file', () => {
  for (const argv of [['--file', 'app.js', 'Tolong'], ['-f', 'app.js', 'Tolong'], ['--file=app.js', 'Tolong']]) {
    const args = parseArgs(argv);
    assert.strictEqual(args.file, 'app.js');
    assert.strictEqual(args.prompt, 'Tolong');
  }
});

test('parseArgs: --file boleh diletakkan setelah pesan', () => {
  const args = parseArgs(['Tolong refactor', '--file', 'app.js']);
  assert.strictEqual(args.file, 'app.js');
  assert.strictEqual(args.prompt, 'Tolong refactor');
});

test('parseArgs: --file tanpa path menghasilkan error', () => {
  assert.throws(() => parseArgs(['--file']), /membutuhkan path file/);
});

test('parseArgs: --help dan --version', () => {
  assert.strictEqual(parseArgs(['-h']).help, true);
  assert.strictEqual(parseArgs(['--help']).help, true);
  assert.strictEqual(parseArgs(['-v']).version, true);
  assert.strictEqual(parseArgs(['--version']).version, true);
});

test('describeError: tidak ada koneksi internet', () => {
  assert.match(describeError(networkError('ENOTFOUND')), /Tidak ada koneksi internet/);
  assert.match(describeError(networkError('EAI_AGAIN')), /Tidak ada koneksi internet/);
});

test('describeError: koneksi ditolak, terputus, dan habis waktu', () => {
  assert.match(describeError(networkError('ECONNREFUSED')), /ditolak/);
  assert.match(describeError(networkError('ECONNRESET')), /terputus/);
  assert.match(describeError(networkError('ETIMEDOUT')), /habis waktu/);
  assert.match(describeError(networkError('UND_ERR_CONNECT_TIMEOUT')), /habis waktu/);
});

test('describeError: batas waktu respons server', () => {
  const error = Object.assign(new Error('aborted'), { name: 'AbortError' });
  assert.match(describeError(error), /tidak merespons dalam 30 detik/);
});

test('describeError: error lain menampilkan pesan aslinya', () => {
  assert.strictEqual(describeError(new Error('HTTP Error: 500')), 'Gagal terhubung ke API Mooncrust: HTTP Error: 500');
});

test('handleLine: mengembalikan teks dari baris data', () => {
  assert.strictEqual(silenced(() => handleLine('data: {"text":"Halo"}')), 'Halo');
  assert.strictEqual(silenced(() => handleLine('data: {"text":"Halo"}\r')), 'Halo');
});

test('handleLine: mengabaikan [DONE], error server, baris kosong, dan JSON rusak', () => {
  for (const line of ['data: [DONE]', 'data: {"error":"timeout"}', '', ': ping', 'data: {"text":']) {
    assert.strictEqual(silenced(() => handleLine(line)), '');
  }
});
