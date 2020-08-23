import {
  START_DATE,
  START_YEAR,
  NUM_OF_YEARS,
  MONTH_NAMES,
  MONTHS_PER_YEAR,
  QUARTERS_PER_YEAR,
  MONTHS_PER_QUARTER,
  NUM_OF_MONTHS,
  MAX_TRACK_START_GAP,
  MAX_ELEMENT_GAP,
  MAX_MONTH_SPAN,
  MIN_MONTH_SPAN,
  NUM_OF_WEEKS,
  HOURS_PER_WEEK,
  DAYS_PER_WEEK,
  HOURS_PER_DAY,
  NUM_OF_HOURS,
  MAX_HOUR_SPAN,
  MIN_HOUR_SPAN
} from './constants'

import moment from 'moment'
import { fill, hexToRgb, colourIsLight, addMonthsToYear, addMonthsToYearAsDate, nextColor, randomTitle } from './utils'

export const buildDayCells = () => {
  const m = START_DATE.clone()
  const v = []
  for (let i = 0; i < DAYS_PER_WEEK * NUM_OF_WEEKS; i += 1) {
    const day = {
      id: `w${m.isoWeek()}-d${m.weekday()}`,
      title: m.format('ddd DD.MMM YYYY'),
      start: m.startOf('day').toDate()
    }
    m.add(1, 'd')
    day.end = m.startOf('day').toDate()
    v.push(day)
  }
  return v
}

export const buildHourCells = () => {
  const m = START_DATE.clone()
  const v = []
  for (let i = 0; i < NUM_OF_HOURS; i += 1) {
    const hour = {
      id: `w${m.isoWeek()}-d${m.weekday()}-h${m.hour()}`,
      title: m.format('LT'),
      start: m.startOf('hour').toDate()
    }
    m.add(1, 'h')
    hour.end = m.startOf('h').toDate()
    v.push(hour)
  }
  return v
}

export const buildTimebar = () => [
  {
    id: 'days',
    title: 'Days',
    cells: buildDayCells(),
    style: {}
  },
  {
    id: 'hours',
    title: 'Hours',
    cells: buildHourCells(),
    useAsGrid: true,
    style: {}
  }
]

export const buildElement = ({ trackId, start, end, i }) => {
  const bgColor = nextColor()
  const color = colourIsLight(...hexToRgb(bgColor)) ? '#000000' : '#ffffff'
  return {
    id: `t-${trackId}-el-${i}`,
    title: randomTitle(),
    start,
    end,
    style: {
      backgroundColor: `#${bgColor}`,
      color,
      borderRadius: '4px',
      boxShadow: '1px 1px 0px rgba(0, 0, 0, 0.25)',
      textTransform: 'capitalize',
    },
  }
}

export const buildTrackStartGap = () => Math.floor(Math.random() * MAX_TRACK_START_GAP)
export const buildElementGap = () => Math.floor(Math.random() * MAX_ELEMENT_GAP)

export const buildElements = trackId => {
  const v = []
  let i = 1
  let hour = buildTrackStartGap()

  while (hour < NUM_OF_HOURS) {
    let hourSpan = Math.floor(Math.random() * (MAX_HOUR_SPAN - (MIN_HOUR_SPAN - 1))) + MIN_HOUR_SPAN

    if (hour + hourSpan > NUM_OF_HOURS) {
      hourSpan = NUM_OF_HOURS - hour
    }

    v.push(buildElement({
      trackId,
      start: START_DATE.clone().add(hour, 'h').toDate(),
      end: START_DATE.clone().add(hour + hourSpan, 'h').toDate(),
      i,
    }))
    const gap = buildElementGap()
    hour += hourSpan + gap
    i += 1
  }

  return v
}

export const buildSubtrack = (trackId, subtrackId, subtrackName) => ({
  id: `track-${trackId}-${subtrackId}`,
  title: subtrackName,
  elements: buildElements(subtrackId),
})

export const buildTrack = (trackId, trackName) => {
  return {
    id: `track-${trackId}`,
    title: trackName,
    elements: buildElements(trackId),
    tracks: [],
    // hasButton: true,
    // link: 'www.google.com',
    isOpen: false,
  }
}