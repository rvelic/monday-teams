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
    super(props);

    // Default state
    this.state = {
      settings: {}, // {teamsColumn, ownerTeamColumn, ownerColumn, workdayStart, workdayHours}
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
    };
  }

  componentDidMount() {
    monday.listen('settings', (res) => {
      this.setState({settings: res.data})
      this.setState({workdayStartMoment: NOW.clone().hours(res.data.workdayStart)})
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
    if (!this.state.settings.teamsColumn) {
      console.log('TeamsColumn is not set!')
      // TODO: add validation
    }
    const teamsColumn = Object.keys(this.state.settings.teamsColumn).shift();

    monday.api(`query {      
      boards(ids:[${this.state.context.boardId}]) {
        name
        items(ids:[${this.state.itemIds}]) {
          name
          column_values(ids:[${teamsColumn}]) {
            id
            value
          }
        }
      }
    }`).then((res) => {
      this.setState({items: res.data.boards[0].items});
      this.setState({teamIds: this.state.items.reduce((teamIds, item) => {
        item.column_values
          .filter(col => col.id === teamsColumn && col.value)
          .map(col => {
            JSON.parse(col.value).personsAndTeams
            .forEach(personOrTeam => {
              if (personOrTeam.kind === 'team' && !teamIds.includes(personOrTeam.id))
                teamIds.push(personOrTeam.id);
            })
          })
        return teamIds;
      }, [])});
      // clear tracks if no teamIds are found in items
      return this.state.teamIds.length < 1 ? null : monday.api(`query {
        teams(ids:[${this.state.teamIds}]) {
          id
          name
          users {
            id
            name
            utc_hours_diff
          }
        }
      }`);
    }).then((res) => {
      this.setState({teams: res ? res.data.teams : []});
      this.fillTracksWithTeams();
    })
  }

  fillTracksWithTeams() {
    let colorIdx = -1
    const workdayHours = this.state.settings.workdayHours
    this.setState({tracks: this.state.teams
      .map(team => {
        const color = nextItem(MONDAY_COLORS, colorIdx)
        colorIdx = nextIndex(MONDAY_COLORS, colorIdx)
        const track = buildTrack(team.id, team.name)
        let isNextConsumed = false
        track.tracks = team.users.map(user => this.fillSubTracksWithUsers(team.id, user.id, user.name, user.utc_hours_diff, color));
        const elements = team.users.reduce((acc, user, i, users) => {
          const currentDiff = user.utc_hours_diff
          const item = {utc_hours_diff: currentDiff, span: workdayHours}
          if (isNextConsumed) {
            isNextConsumed = false
            return acc
          } else if (i === users.length - 1) {
            acc.push(item)
            return acc
          }
          const nextDiff = users[i+1].utc_hours_diff
          const isCurrentFirst = currentDiff > nextDiff
          const current = utcDiffMoment(this.state.workdayStartMoment, currentDiff)
          const next = utcDiffMoment(this.state.workdayStartMoment, nextDiff)
          const end = isCurrentFirst ? current.clone().add(workdayHours, 'h') : next.clone().add(workdayHours, 'h')
          const hourDiff = isCurrentFirst ? end.diff(next, 'hours') : end.diff(current, 'hours')
          if (hourDiff > -1) {
            item.utc_hours_diff = isCurrentFirst ? currentDiff : nextDiff
            item.span = (workdayHours * 2) - hourDiff
            isNextConsumed = true
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
        return track;
      })
    });
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
    return track;
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
    return element.kind !== 'team' ? null : monday.execute('confirm', {
        message: `<p><strong>Assign ${element.title} team?</strong></p>
                  <p>This will set ${element.title} as the "Owner Team" on all displayed items.</p>`,
        confirmButton: 'Assign',
        cancelButton: 'Cancel'
    }).then((res) => {
      if (res.data.confirm) return this.activateTeam(element.trackId)
    }).then((res) => {
      if (res) {
        monday.execute('notice', {
          message: `${res.length} item(s) updated.`,
          type: 'success'
        })
      }
      const column_id = Object.keys(this.state.settings.ownerColumn).shift()
      if (res && column_id) {
        return monday.execute('confirm', {
          message: `<p><strong>Assign a random user from ${element.title} team?</strong></p>
                    <p>This will set a random user from ${element.title} team as the "Owner" on all displayed items.</p>`,
          confirmButton: 'Assign',
          cancelButton: 'Don\'t assign'
        })
      }
    }).then((res) => {
      if (res && res.data.confirm) return this.activateOwner(element.trackId)
    }).then((res) => {
      if (res) {
        monday.execute('notice', {
          message: `${res.length} item(s) updated.`,
          type: 'success'
        })
      }
    })
  }

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
        if (track.id === t.id ) t.isOpen = !t.isOpen;
        return t;
      })
    });
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

export default App;
