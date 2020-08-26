import React from "react"
import mondaySdk from "monday-sdk-js"
import moment from 'moment'
import Timeline from 'react-timelines'
import "./App.css"
import 'react-timelines/lib/css/style.css'
import { NOW, NOW_UTC_HOURS_DIFF, START_DATE, END_DATE, MIN_ZOOM, MAX_ZOOM, MONDAY_COLORS } from './constants'
import { buildTimebar, buildTrack, buildSubtrack, buildElements } from './builders'
import { randomIndex, nextItem, nextIndex } from './utils'

const monday = mondaySdk()
const timebar = buildTimebar()

class App extends React.Component {
  constructor(props) {
    super(props)
    // Default state
    this.state = {
      settings: {},
      workdayStartMoment: null,
      context: {},
      itemIds: [],
      items: [],
      teamIds: [],
      teams: [],
      name: "",
      open: false,
      zoom: 1800,
      tracks: []
    }
  }

  componentDidMount() {
    monday.listen('settings', (res) => {
      const settings = {
        teamsColumn: res.data.teamsColumn,
        ownerColumn: res.data.ownerColumn,
        ownerTeamColumn: res.data.ownerTeamColumn,
        workdayStart: res.data.workdayStart || '9',
        workdayHours: res.data.workdayHours || '8'
      }
      this.setState({settings})
      this.setState({workdayStartMoment: NOW.clone().hours(settings.workdayStart)})
      // re-create timeline when settings change
      if (this.state.itemIds.length > 0) this.createTimeline()
    })

    monday.listen('context', (res) => {
      this.setState({context: res.data})
    })

    monday.listen('itemIds', (res) => {
      this.setState({itemIds: res.data})
      this.createTimeline()
    })
  }

  createTimeline() {
    monday.api(`query {      
      boards(ids:[${this.state.context.boardId}]) {
        name
        items(ids:[${this.state.itemIds}]) {
          name
          column_values() {
            id
            value
          }
        }
      }
    }`)
    .then(res => {
      this.setState({items: res.data.boards.shift().items})
      const teamsColumn = Object.keys(this.state.settings.teamsColumn).shift()
      // If there is teamsColumn defined, get only teams used within items
      // if there is no teamsColumn defined, get all the teams
      if (teamsColumn) {
        this.setState({teamIds: this.state.items.reduce((acc, item) => {
          acc.push(item.column_values.filter(col => col.id === teamsColumn && col.value)
              .map(col => JSON.parse(col.value).personsAndTeams
                .filter(personOrTeam => personOrTeam.kind === 'team' && !acc.includes(personOrTeam.id))
                .map(personOrTeam => personOrTeam.id)
              ).flat())
          return acc
        }, []).flat()})
      }
      return monday.api(`query {
        teams(ids:[${this.state.teamIds}]) {
          id
          name
          users {
            id
            name
            utc_hours_diff
          }
        }
      }`)
    })
    .then(res => {
      if (res.data.teams) this.setState({teams: res.data.teams})
      this.fillTracksWithTeams()
    })
  }

  fillTracksWithTeams() {
    let colorIdx = -1
    const workdayHours = parseInt(this.state.settings.workdayHours)
    this.setState({tracks: this.state.teams
      .map(team => {
        const color = nextItem(MONDAY_COLORS, colorIdx)
        colorIdx = nextIndex(MONDAY_COLORS, colorIdx)
        const track = buildTrack(team.id, team.name)
        track.tracks = team.users.map(user => this.fillSubTracksWithUsers(team.id, user.id, user.name, user.utc_hours_diff, color))
        const elements = team.users.sort(byUtcDiff).reduce((acc, user, i, users) => {
          const currentDiff = user.utc_hours_diff
          const item = {utc_hours_diff: currentDiff, span: workdayHours}
          if (acc.length < 1) {
            acc.push(item)
            return acc
          }
          const prevItem = acc[acc.length-1]
          const prevEnd = utcDiffMoment(this.state.workdayStartMoment, prevItem.utc_hours_diff).add(prevItem.span, 'h')
          const currentStart = utcDiffMoment(this.state.workdayStartMoment, user.utc_hours_diff)
          const hourDiff = prevEnd.diff(currentStart, 'hours')
          // If prev and current are bordering or overlapping, merge them
          if (hourDiff > -1) {
            prevItem.span = (prevItem.span + workdayHours) - hourDiff
            return acc
          }
          acc.push(item)
          return acc
        }, [])
        track.elements = elements.map(element => buildElements(
          team.id,
          team.name,
          utcDiffMoment(this.state.workdayStartMoment, element.utc_hours_diff),
          element.span,
          'team',
          color
        )).flat()
        return track
      })
    })
  }

  fillSubTracksWithUsers = (teamId, userId, userName, utcDiff, color) => {
    const track = buildSubtrack(teamId, userId, userName)
    track.elements = buildElements(
      teamId,
      userName,
      utcDiffMoment(this.state.workdayStartMoment, utcDiff),
      this.state.settings.workdayHours,
      'user',
      color
    )
    return track
  }

  activateTeam = (teamId) => {
    // We need to run JSON.stringify 2x to get correct format
    const value = JSON.stringify(JSON.stringify({
      "personsAndTeams": [{
        "id": parseInt(teamId),
        "kind": "team"
      }]
    }))
    const board_id = parseInt(this.state.context.boardId)
    const column_id = Object.keys(this.state.settings.ownerTeamColumn).shift()
    return Promise.all(this.state.itemIds.map(id => monday.api(`mutation {
      change_column_value(
        board_id: ${board_id},
        item_id: ${id},
        column_id: "${column_id}",
        value: ${value}
      ){
        id
      }
    }`)))
  }

  activateOwner = (teamId) => {
    const users = this.state.teams
      .filter(team => team.id === teamId)
      .shift().users
    let userIdx = randomIndex(users)    
    const board_id = parseInt(this.state.context.boardId)
    const column_id = Object.keys(this.state.settings.ownerColumn).shift()
    return Promise.all(this.state.itemIds.map(id => {
      const user = nextItem(users, userIdx)
      userIdx = nextIndex(users, userIdx)
      // We need to run JSON.stringify 2x to get correct format
      const value = JSON.stringify(JSON.stringify({
        "personsAndTeams": [{
          "id": parseInt(user.id),
          "kind": "person"
        }]
      }))
      return monday.api(`mutation {
        change_column_value(
          board_id: ${board_id},
          item_id: ${id},
          column_id: "${column_id}",
          value: ${value}
        ){
          id
        }
      }`)
    }))
  }

  handleClickElement = (element) => {
    const ownerTeamColumn = Object.keys(this.state.settings.ownerTeamColumn).shift()
    const ownerColumn = Object.keys(this.state.settings.ownerColumn).shift()
    Promise.resolve().then(res => {
      // Actions are restricted to settings set by user
      // - If there is no ownerTeam set, nothing will happen on click
      // - If there is no owner set, user won't be asked to assing random user
      if (element.kind !== 'team') return Promise.reject()
      if (ownerTeamColumn) return this.executeActivateOwnerTeamConfirm(element)
      if (ownerColumn) return this.executeActivateOwnerConfirm(element)
    }).then(res => {
      if (!res.data.confirm) return Promise.reject()
      if (ownerTeamColumn) return this.activateTeam(element.trackId)
      if (ownerColumn) return this.activateOwner(element.trackId)
    }).then(res => {
      if (!res) return Promise.reject()
      this.executeItemsUpdatedNotice(res.length)
      if (ownerTeamColumn && ownerColumn) return this.executeActivateOwnerConfirm(element)
    }).then(res => {
      if (!res) return Promise.reject()
      if (res.data.confirm) return this.activateOwner(element.trackId)
    }).then(res => {
      if (res) this.executeItemsUpdatedNotice(res.length)
    }).catch(()=>{})
  }

  executeActivateOwnerTeamConfirm = (element) => monday.execute('confirm', {
    message: `<p><strong>Assign ${element.title} team?</strong></p>
              <p>This will set ${element.title} as the "Owner Team" on all displayed items.</p>`,
    confirmButton: 'Assign',
    cancelButton: 'Cancel'
  })

  executeActivateOwnerConfirm = (element) => monday.execute('confirm', {
    message: `<p><strong>Assign a random user from ${element.title} team?</strong></p>
              <p>This will set a random user from ${element.title} team as the "Owner" on all displayed items.</p>`,
    confirmButton: 'Assign',
    cancelButton: 'Don\'t assign'
  })

  executeItemsUpdatedNotice = (count) => monday.execute('notice', {
    message: `${count} item(s) updated.`,
    type: 'success'
  })

  handleToggleOpen = () => {
    this.setState(({ open }) => ({ open: !open }))
  }

  handleZoomIn = () => {
    this.setState(({ zoom }) => ({ zoom: Math.min(zoom + 100, MAX_ZOOM) }))
  }

  handleZoomOut = () => {
    this.setState(({ zoom }) => ({ zoom: Math.max(zoom - 100, MIN_ZOOM) }))
  }

  handleToggleTrackOpen = track => {
    this.setState({tracks: this.state.tracks
      .map(t => {
        if (track.id === t.id ) t.isOpen = !t.isOpen
        return t
      })
    })
  }

  render() {
    const { open, zoom, tracks } = this.state
    return (
      <div className="app">
        <Timeline
          scale={{
            start: START_DATE.toDate(),
            end: END_DATE.toDate(),
            zoom,
            zoomMin: MIN_ZOOM,
            zoomMax: MAX_ZOOM,
          }}
          isOpen={open}
          toggleOpen={this.handleToggleOpen}
          zoomIn={this.handleZoomIn}
          zoomOut={this.handleZoomOut}
          clickElement={this.handleClickElement}
          timebar={timebar}
          tracks={tracks}
          now={NOW.toDate()}
          toggleTrackOpen={this.handleToggleTrackOpen}
          enableSticky
          scrollToNow
        />
      </div>
    )
  }
}

const utcDiffMoment = (startMoment, utcHoursDiff) => {
  return moment.utc(startMoment)
    .add(NOW_UTC_HOURS_DIFF - utcHoursDiff, 'h')
}

const byUtcDiff = (a, b) => {
  return b.utc_hours_diff - a.utc_hours_diff
}

export default App