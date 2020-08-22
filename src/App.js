import React from "react";
import "./App.css";
import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

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
      name: ""
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

  render() {
    return <div className="App">
      {this.state.teams.map((team) => {
        return <div><p>{team.id}</p>
        <p>{team.name}</p></div>
      })}
    </div>;
  }
}

export default App;
