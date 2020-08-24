/* eslint-disable no-bitwise */

export const fill = n => {
  const arr = []
  for (let i = 0; i < n; i += 1) {
    arr.push(i)
  }
  return arr
}

const COLORS = ['00C875', '4ECCC6', 'FAA1F1', '66CCFF', '784BD1', 'FFCB00', '#5559DF', '579BFC', '68A1BD', 'FF7575']

export const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)]

let color = -1
export const nextColor = () => {
  color = (color + 1) % COLORS.length
  return COLORS[color]
}

// let prevColor = null
// export const nextRandomColor = () => {
//   let c = randomColor()
//   while (c === prevColor) {
//     c = randomColor()
//   }
//   prevColor = c
//   return c
// }

// export const randomColor = () => {
//   const LETTERS = '0123456789ABCDEF'
//   let color = ''
//   for (let i = 0; i < 6; i += 1) {
//     color += LETTERS[Math.floor(Math.random() * 16)]
//   }
//   return color
// }

export const hexToRgb = hex => {
  const v = parseInt(hex, 16)
  const r = (v >> 16) & 255
  const g = (v >> 8) & 255
  const b = v & 255
  return [r, g, b]
}

export const colourIsLight = (r, g, b) => {
  const a = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return a < 0.5
}