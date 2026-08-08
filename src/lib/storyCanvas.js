/**
 * storyCanvas.js — build the 9:16 story export on an offscreen canvas.
 * Pure drawing from an already-loaded image; the caller handles I/O
 * (load the cover, toBlob, download). Design tokens mirror theme.css —
 * canvas can't read CSS vars, so the shibui palette is inlined here.
 */

const W = 1080
const H = 1920

const PAPER = '#FCFAF6'
const INK = '#22271F'
const STONE = '#8B857A'
const PINE = '#1E2B22'
const HORIZON = ['#E8C9A0', '#DFA98C', '#C98B7E'] // 2 : 2 : 1

const SERIF = "'Shippori Mincho', 'Frank Ruhl Libre', serif"
const BODY = "'Karla', 'Assistant', system-ui, sans-serif"

/** object-fit: cover, centred. */
function drawCover(ctx, img, dx, dy, dw, dh) {
  const scale = Math.max(dw / img.naturalWidth, dh / img.naturalHeight)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

/** the 2px sunset in 2:2:1 proportion, scaled to the frame. */
function drawHorizon(ctx, x, y, w, h) {
  const unit = w / 5
  const widths = [unit * 2, unit * 2, unit]
  let cx = x
  widths.forEach((seg, i) => {
    ctx.fillStyle = HORIZON[i]
    ctx.fillRect(cx, y, seg, h)
    cx += seg
  })
}

/**
 * Draw the whole story. `img` is an HTMLImageElement (the cover).
 * Returns the canvas so the caller can toBlob it.
 */
export function buildStoryCanvas(img, { name, yearFrom, yearTo }) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)

  // Passe-partout frame: generous paper margin, 4:5 photo.
  const margin = 96
  const frameX = margin
  const frameW = W - margin * 2
  const photoInset = 14
  const photoX = frameX + photoInset
  const photoW = frameW - photoInset * 2
  const photoH = Math.round(photoW * 5 / 4)
  const photoY = 340

  ctx.fillStyle = PINE
  ctx.fillRect(photoX, photoY, photoW, photoH)
  drawCover(ctx, img, photoX, photoY, photoW, photoH)
  drawHorizon(ctx, photoX, photoY + photoH, photoW, 6)

  // Tree name (serif).
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.font = `500 68px ${SERIF}`
  ctx.fillText(name || '', W / 2, photoY + photoH + 130)

  // Year range.
  const years = yearFrom && yearTo
    ? (yearFrom === yearTo ? `${yearFrom}` : `${yearFrom} – ${yearTo}`)
    : ''
  if (years) {
    ctx.fillStyle = STONE
    ctx.font = `400 38px ${BODY}`
    ctx.fillText(years, W / 2, photoY + photoH + 196)
  }

  // Wordmark watermark, bottom-centre.
  ctx.fillStyle = STONE
  ctx.font = `500 30px ${SERIF}`
  ctx.save()
  ctx.translate(W / 2, H - 96)
  const wordmark = 'N E B A R I'
  ctx.fillText(wordmark, 0, 0)
  ctx.restore()

  return canvas
}
