import {
  START_DATE,
  NUM_OF_WEEKS,
  DAYS_PER_WEEK,
  NUM_OF_HOURS,
  NUM_OF_DAYS
} from './constants'

import { hexToRgb, colourIsLight, uuidv4 } from './utils'

export const buildDayCells = () => {
  const m = START_DATE.clone()
  const v = []
  for (let i = 0; i < DAYS_PER_WEEK * NUM_OF_WEEKS; i++) {
    const day = {
      id: `w${m.isoWeek()}-d${m.weekday()}`,
      title: m.format('ddd DD. MMM YYYY'),
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
  for (let i = 0; i < NUM_OF_HOURS; i++) {
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

export const buildElements = (trackId, trackName, start, span, kind, bgColor) => {
  const v = []
  // Rewind to start of the week but keep the hours
  const m = start.clone().startOf('isoWeek').hour(start.hour())
  for (let i = 0; i < NUM_OF_DAYS; i++) {
    const s = m.startOf('hour')
    const e = m.clone().add(span, 'h')
    const element = {
      id: `t-${trackId}-el-${i}-${uuidv4()}`,
      trackId,
      title: trackName,
      kind, // 'team' or 'user'
      start: s.toDate(),
      end: e.toDate(),
      tooltip: `${trackName} ${s.local().format('LT')} - ${e.local().format('LT')}`,
      style: {
        backgroundColor: `#${bgColor}`,
        color: colourIsLight(...hexToRgb(bgColor)) ? '#000000' : '#323338',
        borderRadius: '4px',
        boxShadow: '0.0px 4.0px 8.0px 0px rgba(0, 0, 0, 0.1)',
        textTransform: 'capitalize',
      }
    }
    m.add(1, 'd')
    v.push(element)
  }
  return v
}

export const buildSubtrack = (trackId, subtrackId, subtrackName) => ({
  id: `track-${trackId}-${subtrackId}`,
  title: subtrackName,
  elements: []
})

export const buildTrack = (trackId, trackName) => ({
  id: `track-${trackId}`,
  title: trackName,
  elements: [],
  tracks: [],
  // hasButton: true,
  // link: 'www.google.com',
  isOpen: false
})

export const buildTeamTree = (users, teams) => {
  let tree = {}
  teams.forEach(team => {
    tree[team.id] = team.users.map(user => user.id)
  })
  users.forEach(user => {
    user.teams.forEach(team => {
      if (!tree[team.id]) tree[team.id] = []
      if (!tree[team.id].includes(user.id)) tree[team.id].push(user.id)
    })
  })
  return tree
}

export const buildChartStats = (logs, users, teams) => {
  const tree = buildTeamTree(users, teams)
  return [
    { name: 'own-solved', value: 100, fill: '#00C875' },
    { name: 'own-unsolved', value: 2, fill: '#FFADAD' },
    { name: 'inherited-solved', value: 20, fill: '#4ECCC6' },
    { name: 'inherited-unsolved', value: 40, fill: '#FFCB00' },
    { name: 'changes', value: 60, fill: '#784BD1' },
    { name: 'activity', value: 30, fill: '#401694' }
  ]
}