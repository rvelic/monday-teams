/* eslint-disable no-bitwise */

export const fill = n => {
  const arr = []
  for (let i = 0; i < n; i += 1) {
    arr.push(i)
  }
  return arr
}

const COLORS = ['00C875', '4ECCC6', 'FAA1F1', '66CCFF', '784BD1', 'FFCB00', '579BFC', '68A1BD', 'FF7575']

export const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)]

let color = -1
export const nextColor = () => {
  color = (color + 1) % COLORS.length
  return COLORS[color]
}