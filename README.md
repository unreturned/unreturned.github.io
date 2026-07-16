# Kovalkoff

URL: https://kovalkoff.ru/

## Local server

```bash
make start
# http://localhost:3000/
make stop
```

## Resume

Source of truth: `resume.json`. Rendered in the browser by `js/resume.js`.

```bash
make resume   # validate resume.json
```

## Git hooks

```bash
make install-git
```

## Open locally

```bash
make test
```

## Images / QR

```bash
jpegoptim --max=90 --strip-all *.jpeg
optipng -strip all *.png
qrencode
magick input.png -background white -flatten -quality 80 output.jpg
```
