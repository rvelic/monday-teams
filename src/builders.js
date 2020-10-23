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
    if (!tree[team.id]) tree[team.id] = {name: team.name, users: {}, columns: {}}
    tree[team.id].users = team.users.reduce((acc, user) => {
      acc[user.id] = {name: user.name, handedover: 0, workedon: 0}
      return acc
    }, {})
  })
  users.forEach(user => {
    user.teams.forEach(team => {
      if (!tree[team.id]) tree[team.id] = {name: team.name, users: {}, columns: {}}
      if (!tree[team.id].users[user.id]) {
        tree[team.id].users[user.id] = {name: user.name, handedover: 0, workedon: 0}
      }
    })
  })
  return tree
}

export const buildChartStats = (logs, users, teams, teamId) => {
  const tree = buildTeamTree(users, teams)
  const teamId = teamId || Object.keys(tree).shift()
  const stats = []
  let topPerformer = {}
  let bottomPerformer = {}
  // Perform analytics
  logs.forEach(log => {
    // previous value (handover)
    if (log.data.previous_value && log.data.previous_value.personsAndTeams &&
        log.data.previous_value.personsAndTeams.length > 0) {
      let pot = log.data.previous_value.personsAndTeams[0]
      if (pot.kind === 'team') {
        tree[pot.id].columns[log.data.column_id] = initOrReturnColumn(tree[pot.id], log.data.column_id, log.data.column_title)
        tree[pot.id].columns[log.data.column_id].handedover++
      }
      if (pot.kind === 'person') {
        findTeamIds(tree, pot.id).forEach(tid => {
          tree[tid].columns[log.data.column_id] = initOrReturnColumn(tree[tid], log.data.column_id, log.data.column_title)
          tree[tid].columns[log.data.column_id].handedover++
          tree[tid].users[pot.id].handedover++
        })
      }
    }
    // (current) value (workedon)
    if (log.data.value && log.data.value.personsAndTeams &&
        log.data.value.personsAndTeams.length > 0) {
      let pot = log.data.value.personsAndTeams[0]
      if (pot.kind === 'team') {
        tree[pot.id].columns[log.data.column_id] = initOrReturnColumn(tree[pot.id], log.data.column_id, log.data.column_title)
        tree[pot.id].columns[log.data.column_id].workedon++
      }
      if (pot.kind === 'person') {
        findTeamIds(tree, pot.id).forEach(tid => {
          tree[tid].columns[log.data.column_id] = initOrReturnColumn(tree[tid], log.data.column_id, log.data.column_title)
          tree[tid].columns[log.data.column_id].workedon++
          tree[tid].users[pot.id].workedon++
        })
      }
    }
  })
  // Format stats to recharts
  Object.keys(tree[teamId].users).forEach(id => {
    const user = tree[teamId].users[id]
    if (!topPerformer.handedover) topPerformer = user
    if (user.handedover < topPerformer.handedover) topPerformer = user
    if (!bottomPerformer.handedover) bottomPerformer = user
    if (user.handedover > bottomPerformer.handedover) bottomPerformer = user
  })
  stats.push({
    name: `least-handedover`,
    tooltip: `${topPerformer.name} handed over the least`,
    amount: topPerformer.handedover,
    fill: '#4ECCC6'
  })
  stats.push({
    name: `most-handedover`,
    tooltip: `${bottomPerformer.name} handed over the most`,
    amount: bottomPerformer.handedover,
    fill: '#FFCB00'
  })
  Object.keys(tree[teamId].columns).forEach(id => {
    const col = tree[teamId].columns[id]
    stats.push({
      name: `${id}-workedon`,
      tooltip: `${tree[teamId].name} worked on as ${col.name}`,
      amount: col.workedon,
      fill: '#4ECCC6'
    })
    stats.push({
      name: `${id}-handedover`,
      tooltip: `${tree[teamId].name} handed over to another ${col.name}`,
      amount: col.handedover,
      fill: '#FFCB00'
    })
  })
  return stats
}

export const initOrReturnColumn = (team, columnId, columnName) => {
  if (!team.columns[columnId]) return {name: columnName, handedover: 0, workedon: 0}
  return team.columns[columnId]
}

export const findTeamIds = (tree, userId) => Object.keys(tree)
  .filter(teamId => Object.keys(tree[teamId].users)
  .reduce((acc, uid) => {
    if (acc) return true
    return userId === parseInt(uid)
  },false))