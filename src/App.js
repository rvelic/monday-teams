import React, { Component } from "react";
import mondaySdk from "monday-sdk-js";
import Timeline from 'react-timelines';

import "./App.css";
import 'react-timelines/lib/css/style.css'

import { START_YEAR, NUM_OF_YEARS, NUM_OF_TRACKS } from './constants'
import { buildTimebar, buildTrack } from './builders'
import { fill } from './utils'

const monday = mondaySdk();
const now = new Date()
const timebar = buildTimebar()

// eslint-disable-next-line no-alert
const clickElement = element => alert(`Clicked element\n${JSON.stringify(element, null, 2)}`)

const MIN_ZOOM = 2
const MAX_ZOOM = 20

class App extends React.Component {
  constructor(props) {
    super(props);

    const tracksById = fill(NUM_OF_TRACKS).reduce((acc, i) => {
      const track = buildTrack(i + 1)
      acc[track.id] = track
      return acc
    }, {})

    // Default state
    this.state = {
      settings: {},
      context: {},
      itemIds: [],
      items: [],
      teamIds: [],
      teams: [],
      name: "",
      open: false,
      zoom: 2,
      // eslint-disable-next-line react/no-unused-state
      tracksById,
      tracks: Object.values(tracksById)
    };
  }

  componentDidMount() {
    monday.listen('settings', (res) => {
      this.setState({settings: res.data});
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
              time_zone_identifier
            }
          }
        }`);
      }).then((res) => {
        this.setState({teams: res.data.teams});
      })
    })
  }

  handleToggleOpen = () => {
    this.setState(({ open }) => ({ open: !open }))
  }

  handleZoomIn = () => {
    this.setState(({ zoom }) => ({ zoom: Math.min(zoom + 1, MAX_ZOOM) }))
  }

  handleZoomOut = () => {
    this.setState(({ zoom }) => ({ zoom: Math.max(zoom - 1, MIN_ZOOM) }))
  }

  handleToggleTrackOpen = track => {
    this.setState(state => {
      const tracksById = {
        ...state.tracksById,
        [track.id]: {
          ...track,
          isOpen: !track.isOpen,
        },
      }

      return {
        tracksById,
        tracks: Object.values(tracksById),
      }
    })
  }

  // render() {
  //   return <div className="App">
  //     {this.state.teams.map((team) => {
  //       return <div><p>{team.id}</p>
  //       <p>{team.name}</p></div>
  //     })}
  //   </div>;
  // }

  render() {
    const { open, zoom, tracks } = this.state
    const start = new Date(`${START_YEAR}`)
    const end = new Date(`${START_YEAR + NUM_OF_YEARS}`)
    return (
      <div className="app">
        <h1 className="title">Teams</h1>
        <Timeline
          scale={{
            start,
            end,
            zoom,
            zoomMin: MIN_ZOOM,
            zoomMax: MAX_ZOOM,
          }}
          isOpen={open}
          toggleOpen={this.handleToggleOpen}
          zoomIn={this.handleZoomIn}
          zoomOut={this.handleZoomOut}
          clickElement={clickElement}
          clickTrackButton={track => {
            // eslint-disable-next-line no-alert
            alert(JSON.stringify(track))
          }}
          timebar={timebar}
          tracks={tracks}
          now={now}
          toggleTrackOpen={this.handleToggleTrackOpen}
          enableSticky
          scrollToNow
        />
      </div>
    )
  }
}

export default App;
