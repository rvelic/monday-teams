import React, { Component } from "react";
import mondaySdk from "monday-sdk-js";
import moment from 'moment';
import Timeline from 'react-timelines';

import "./App.css";
import 'react-timelines/lib/css/style.css'

import { START_DATE, END_DATE, NUM_OF_WEEKS, MIN_ZOOM, MAX_ZOOM } from './constants'
import { buildTimebar, buildTrack, buildSubtrack } from './builders'

const monday = mondaySdk()
const now = moment().toDate()
const timebar = buildTimebar()

// eslint-disable-next-line no-alert
const clickElement = element => alert(`Clicked element\n${JSON.stringify(element, null, 2)}`)

class App extends React.Component {
  constructor(props) {
    super(props);

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
      zoom: 1800,
      tracks: []
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
        this.fillTracksWithTeams();
      })
    })
  }

  fillTracksWithTeams() {
    this.setState({tracks: this.state.teams
      .map(team => {
        const track = buildTrack(team.id, team.name);
        team.users.forEach(user => {
          track.tracks.push(buildSubtrack(team.id, user.id, user.name))
        });
        return track;
      })
    });
    //this.setState({tracks: Object.values(this.state.tracks)});
    //console.log(this.state.tracks)
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
