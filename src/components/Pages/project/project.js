import React, { Component } from "react";
import { Tab, Label, Container, Image, Header, Table, Segment, Grid, Rail, Divider, Button, Comment, Form, Item, List, Menu, Icon, Card, Statistic } from 'semantic-ui-react';
import Navbar from "../../Common/navbar";
import Chat from "../../Common/chat";
import MemberBlock from "./MemberBlock";
import './project.css';
import axios from 'axios';
import moment from 'moment';
import io from 'socket.io-client';

const socket = io();
const formatDate = date => moment(date).format('MM/DD/YYYY');


class Project extends Component {

  state = {
    _id: '',
    userID: {
      login: false,
      user: {
        github: {
          login: '',
          avatar_url: '',
          name: ''
        }
      }
    },
    name: 'Loading',
    summary: 'Loading data...',
    description: 'Loading data...',
    tech_tags: [],
    start_date: '',
    duration: 0,
    members_wanted: 0,
    google_drive_link: "",
    trello_link: "",
    repo_link: "",
    deploy_link: "",
    chat: [],
    pending_members: [],
    members: [],
    owner_id: '',
    cohort_id: '',
    issues: [],
    pulls: [],
    contributors: [],
    priviledge: 'public'
  };

  // On page load, get project data and send to this.state.project
  // Also, get info on the user and save to this.state.userID
  componentDidMount() {
    this.fetchProjectData()
    .then(repoLink => repoLink ? this.fetchGithubData(repoLink) : repoLink )
    .then(repoInfo => this.checkLoggedIn())


    socket.on('refreshMsg', data => {
     console.log("Refresh Msg Requested:", data);
     this.fetchProjectData();
    })

  }

  fetchProjectData = () => {
    return axios.get(`/api/projectData${this.props.location.pathname}`).then(res => {
      console.log('Project data:',res.data);
      this.setState({ ...res.data[0] });
      return res.data[0].repo_link
    }).catch(error => {
      console.log('Error while fetching data:', error);
      return error;
    });
  }

  fetchGithubData = repo => {
    return axios.get('/api/github', {params: { repo }})
    .then(res => {
      const {issues, pulls, contributors} = res.data;
      this.setState({issues, pulls, contributors})
      return res.data;
    })
    .catch(err => console.log('Error in github pull:', err))
  }

  checkLoggedIn = () => {
    axios.get('/auth/checkLoggedIn').then(res => {
      // ------- Manual Auth Override
      // res.data = {
      //   login: true,
      //   _id: '59cd80c251fe492bb4096713',
      //   user: {
      //     github: {
      //       login: 'aarongaither',
      //       avatar_url: 'https://avatars1.githubusercontent.com/u/16161706?v=4&s=400',
      //       name: 'Aaron Gaither'
      //     }
      //   }
      // }
      if (res.data.login) {
        const curUser = res.data.user.github.login;
        if (this.state.owner_id.github.login === curUser) {
          this.setState({priviledge: 'owner'})
        } else if (this.state.members.find(m => m.github.login === curUser)) {
          this.setState({priviledge: 'member'})
        } else if (this.state.pending_members.find(m => m.github.login === curUser)) {
          this.setState({priviledge: 'pending'})
        }
      }
      this.setState({ userID: res.data });


      // ------- Manual Auth Overrides
      // this.setState({priviledge: 'owner'})
      // this.setState({priviledge: 'member'})
      // this.setState({priviledge: 'pending'})

      console.log('User:',res.data, 'priviledge:', this.state.priviledge);
    }).catch(error => {
      console.log('Catching Error while authing user: ', error);
    });
  }

  renderTeamMembers = () => {
    return this.state.members.map(member => {
      member.contributions = this.state.contributors.find(c => c.name === member.github.login )
      if (!member.contributions) {
        {
          member.contributions = {
              commits: 0,
              additions: 0,
              deletions: 0
          }
        }
      }
      return (
        <MemberBlock {...member}/>
      )
    })
  }

  renderPendingMembers = () => {
    const DecisionButtons = () =>
    (<Card.Content extra>
      <div className='ui two buttons'>
        <Button fluid className='projectClose' >Decline</Button>
        <Button fluid className='projectCheck' >Approve</Button>
      </div>
    </Card.Content>)

    return this.state.pending_members.map(pending_member => (
      <Card className='projectRequest'>
        <Card.Content>
        <Header as='h3'>Pending Members</Header>
        <Divider/>
          <Image src={pending_member.github.avatar_url} shape='circular' size='mini' verticalAlign='middle' /> <span> <strong> {pending_member.github.name} </strong> wants to join.</span>
        </Card.Content>
        {this.state.priviledge === 'owner' ? <DecisionButtons /> : ''}
      </Card>
    ));
  }

  renderTechTags = () => {
    return this.state.tech_tags.map(tech_tag => (
      <Label className='tileTags'>
        {tech_tag}
      </Label>
    ));
  }

  renderPRorIssue = type => {
    const list = this.state[type];
    return list.length === 0 ?
    `No ${type} for this repository, yet.` :
    list.map( item => (
      <Item.Group>
        <Divider/>
        <Item>
          <Item.Image size='mini' as='a' href={item.author.url} src={item.author.avatarUrl} shape='circular'  />
          <Item.Content>
            <Item.Header as='a' href={item.url}>{item.title}</Item.Header>
            <Item.Meta>State: {item.state}</Item.Meta>
          </Item.Content>
        </Item>
      </Item.Group>
    ));
  }

  renderButtonText = () => {
    let buttonText = '';
    const priv = this.state.priviledge;
    if (priv === 'owner') {
      buttonText = 'Edit Project Details';
    } else if (priv === 'member') {
      buttonText = 'You are a member!';
    } else if (priv === 'pending') {
      buttonText = "Awaiting approval..."
    } else {
      buttonText = 'Request to Join!'
    }
    return buttonText;
  }

  panes = () => {
    const teamChat = { menuItem: 'Team Chat', render: () =>
      <Tab.Pane attached={false}>
        <Chat chat_type='private' cohort={this.props.match.params.cohort} user={this.state.userID} projectId={this.state._id}
        chats={this.state.chat.filter(chat => chat.chat_type === 'private')}  />
      </Tab.Pane> }
    const pubChat = { menuItem: 'Public Forum', render: () =>
      <Tab.Pane attached={false}>
        <Chat chat_type='public' cohort={this.props.match.params.cohort} user={this.state.userID} projectId={this.state._id}
        chats={this.state.chat.filter(chat => chat.chat_type === 'public')} />
      </Tab.Pane> }

      return this.state.priviledge === 'owner' || this.state.priviledge === 'member' ? [pubChat, teamChat] : [pubChat];
  }

  render(props) {
    return (
      <div className='projectBackground'>
        <Navbar currentPage='project' cohort={this.props.match.params.cohort} username={this.props.match.params.username} avatar={this.state.userID.user.github.avatar_url}/>
        <Segment textAlign='center' vertical className='projectBanner'>
          <Container text>
            <i className="devicon-angularjs-plain colored devIcon"></i>
            <Header textAlign='center' as='h1' className='projectTitle'>
            {this.state.name}
            </Header>
            <br/><br/><br/>
            <p className='projectSummary'>{this.state.summary}</p>
          </Container>
        </Segment>

        <Grid centered columns={3} className='projectGrid'>
          <Grid.Column>

            <Segment className='projectSegment'>
              <Label attached='top'>{this.state.status}</Label>

              <Segment basic>
                <Header as='h3'>Project Details
                  {this.state.repo_link !== '' ? <Icon link={this.state.repo_link} className='projectIcons' name='github' size='large'/> : ''}
                  {this.state.google_drive_link !== '' ? <Icon link={this.state.google_drive_link} className='projectIcons' name='google' size='large' color='red'/> : ''}
                  {this.state.trello_link !== '' ? <Icon link={this.state.trello_link} className='projectIcons' name='trello' size='large' color='blue' /> : ''}
                </Header>
                <p>{this.state.description}</p>
                {this.renderTechTags()}<br/><br/>
                <Grid divided='vertically'>
                  <Grid.Row columns={3}>
                    <Grid.Column>
                      <Segment>
                        <Header>{formatDate(this.state.start_date)}</Header>
                        <p>Projected Start Date</p>
                      </Segment>
                    </Grid.Column>
                    <Grid.Column>
                      <Segment>
                        <Header>{this.state.duration} weeks </Header>
                        <p>Project Length</p>
                      </Segment>
                    </Grid.Column>
                    <Grid.Column>
                      <Segment>
                        <Header>{this.state.members_wanted} members</Header>
                        <p>Team Size</p>
                      </Segment>
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
                {/* {
                      this.state.deploy_link !== '' ?
                          <Button fluid className='projectCheck' as='a' href={this.state.deploy_link} > View Live Demo </Button>
                      : ''
                    } */}
              </Segment>

              <Segment basic className='projectChat'>
                <Tab menu={{ secondary: true, pointing: true }} panes={this.panes()}/>
              </Segment>

              <Rail position='left'>

                <Segment className='pullRequest'>
                  <Header as='h3'>Pull Requests</Header>
                  {
                    this.state.repo_link === '' ?
                    'No Github Repository Connected.' :
                     this.renderPRorIssue('pulls')
                  }
                </Segment>

                <Segment className='pullRequest'>
                  <Header as='h3'>Issues</Header>
                  {
                    this.state.repo_link === '' ?
                    'No Github Repository Connected.' :
                     this.renderPRorIssue('issues')
                  }
                </Segment>

                <Card.Group>
                  <Card className='projectSegment'>
                    <Card.Content>
                      <Header as='h3'>Project Details</Header>
                      <p>{this.state.description}</p>
                      <div floated='right'>
                        {this.state.repo_link !== '' ? <Icon link={this.state.repo_link} name='github' size='big' /> : ''}
                        {this.state.google_drive_link !== '' ? <Icon link={this.state.google_drive_link} name='google' size='big' /> : ''}
                        {this.state.trello_link !== '' ? <Icon link={this.state.trello_link} name='trello' size='big' /> : ''}
                      </div>
                      <Card>
                        <Card.Content>
                          <Card.Header> {formatDate(this.state.start_date)} </Card.Header>
                          <Card.Meta>Projected Start Date</Card.Meta>
                        </Card.Content>
                      </Card>
                      <Card>
                        <Card.Content>
                          <Card.Header> {this.state.duration} weeks </Card.Header>
                          <Card.Meta>Project Length</Card.Meta>
                        </Card.Content>
                      </Card>
                      <Card>
                        <Card.Content>
                          <Card.Header> {this.state.members_wanted} members</Card.Header>
                          <Card.Meta>Team Size</Card.Meta>
                        </Card.Content>
                      </Card>
                      <Header as='h4'>Technologies Involved</Header>
                      {this.renderTechTags()}
                    </Card.Content>
                    {
                      this.state.deploy_link !== '' ?
                      <Card.Content extra>
                          <Button fluid className='projectCheck' as='a' href={this.state.deploy_link} > View Live Demo </Button>
                      </Card.Content>
                      : ''
                    }

                  </Card>
                </Card.Group>
              </Rail>

              <Rail position='right'>
                  <Segment className='joinRequest'>
                    <Button fluid className='projectJoin' link={this.state.deploy_link}>
                      {this.renderButtonText()}
                    </Button>
                  </Segment>

                <Card.Group>
                  {this.renderPendingMembers()}
                </Card.Group>

                <Segment className='projectSegment'>
                  <Header as='h3'>Team Members</Header>
                  <Divider/>
                  {this.renderTeamMembers()}
                </Segment>
              </Rail>
            </Segment>
          </Grid.Column>
        </Grid>

       </div>
    );
  }
}

export default Project
