import React from "react"
import mondaySdk from "monday-sdk-js"
import moment from 'moment'
import Timeline from 'react-timelines'
import "./App.css"
import 'react-timelines/lib/css/style.css'
import { NOW, NOW_UTC_HOURS_DIFF, START_DATE, END_DATE, MIN_ZOOM, MAX_ZOOM } from './constants'
import { buildTimebar, buildTrack, buildSubtrack, buildElements } from './builders'

const monday = mondaySdk()
const timebar = buildTimebar()

const userTimespan = (users) => users
  .reduce((acc, user) => {
    if (!acc.start || user.utc_hours_diff < acc.start) acc.start = user.utc_hours_diff
    if (!acc.end || user.utc_hours_diff > acc.end) acc.end = user.utc_hours_diff
    return acc
  }, {start: null, end: null})

class App extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      settings: {}, // {teamsColumn, activeTeamColumn, workdayStart, workdayHours}
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
      this.setState({settings: res.data});
      this.setState({workdayStartMoment: NOW.clone().hours(res.data.workdayStart)})
    })

    monday.listen('context', (res) => {
      this.setState({context: res.data});
    })

    monday.listen('itemIds', (res) => {
      this.setState({itemIds: res.data});

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
        }`);
      }).then((res) => {
        this.setState({teams: res.data.teams});
        this.fillTracksWithTeams();
      })
    })
  }

  fillTracksWithTeams() {
    this.setState({tracks: this.state.teams
      .map(team => {
        const uts = userTimespan(team.users)
        const span = (uts.end - uts.start) + parseInt(this.state.settings.workdayHours)
        const track = buildTrack(team.id, team.name);
        track.tracks = team.users.map(user => this.fillSubTracksWithUsers(team.id, user.id, user.name, user.utc_hours_diff));
        track.elements = buildElements(
          team.id,
          team.name,
          moment.utc(this.state.workdayStartMoment).add(NOW_UTC_HOURS_DIFF - uts.end, 'h'),
          span,
          'team'
        )
        return track;
      })
    });
  }

  fillSubTracksWithUsers = (teamId, userId, userName, utcDiff) => {
    const track = buildSubtrack(teamId, userId, userName)
    track.elements = buildElements(
      teamId,
      userName,
      moment.utc(this.state.workdayStartMoment).add(NOW_UTC_HOURS_DIFF - utcDiff, 'h'),
      this.state.settings.workdayHours,
      'user'
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
    const column_id = Object.keys(this.state.settings.activeTeamColumn).shift()

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

  handleClickElement = (element) => {
    return element.kind !== 'team' ? null : monday.execute('confirm', {
        message: `<p><strong>Activate workday of ${element.title} team?</strong></p>
                  <p>This will set ${element.title} as the "Active Team" on all displayed items.</p>`,
        confirmButton: 'Activate',
        cancelButton: 'Cancel'
    }).then((res) => {
      return !res.data.confirm ? null : this.activateTeam(element.trackId)
    }).then((res) => {
      return !res ? null : monday.execute('notice', {
        message: `${res.length} items updated.`,
        type: 'success'
      })
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

export default App;
