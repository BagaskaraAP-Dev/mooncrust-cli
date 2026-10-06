# Mooncrust CLI

Command Line Interface untuk Mooncrust AI.

## Instalasi

```bash
npm install
npm link
```

## Penggunaan

Mode interaktif:

```bash
mooncrust
```

Kirim satu pesan lalu keluar:

```bash
mooncrust "Halo"
```

Sertakan isi file ke dalam pesan:

```bash
mooncrust --file app.js "Tolong refactor ini"
```

| Opsi | Keterangan |
|---|---|
| `-f`, `--file <path>` | File yang isinya disertakan ke dalam pesan |
| `-h`, `--help` | Tampilkan bantuan |

## Build Binary

```bash
npm run build         # Windows dan Linux
npm run build:win     # dist/mooncrust-win.exe
npm run build:linux   # dist/mooncrust-linux
```
