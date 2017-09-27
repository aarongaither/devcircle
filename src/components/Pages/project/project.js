import React, { Component } from "react";
import { Tab, Label, Container, Image, Header, Table, Segment, Grid, Rail, Divider, Button, Comment, Form, Item, List, Menu, Icon, Card, Statistic } from 'semantic-ui-react';
import Navbar from "../../Common/navbar";
import Chat from "../../Common/chat";
import './project.css';
import axios from 'axios';
import moment from 'moment';
import githubAPI from '../../../utils/github-API';
import io from 'socket.io-client';

const socket = io();
const formatDate = date => moment(date).format('MM/DD/YYYY');


class Project extends Component {

  state = {
    _id: '',
    userID: {},
    name: 'Loading',
    summary: 'Loading data...',
    description: 'Loading data...',
    tech_tags: [],
    start_date: '',
    duration: 0,
    members_wanted: 0,
    "google_drive_link": "https://google.com",
    "trello_link": "https://trello.com",
    "repo_link": "https://github.com",
    "deploy_link": "https://heroku.com",
    chat: [],
    pending_members: [],
    members: [],
    owner: '',
    cohort: '',
    issues: [],
    pulls: [],
    contributors: []
  };

  // On page load, get project data and send to this.state.project
  // Also, get info on the user and save to this.state.userID
  componentDidMount() {
    this.fetchProjectData().then(repoLink => this.fetchGithubData(repoLink));

    axios.get('/auth/checkLoggedIn').then((res) => {
      this.setState({ userID: res.data });
      console.log(res.data);
    }).catch(error => {
      console.log('Catching Error while authing user: ', error);
    });

    socket.on('refreshMsg', data => {
     console.log("Refresh Msg Requested:", data);
     this.fetchProjectData();
    })

  }

  fetchProjectData = () => {
    return axios.get(`/api/projectData${this.props.location.pathname}`).then(res => {
      console.log('Project data:',res.data[0]);
      this.setState({ ...res.data[0] });
      return res.data[0].repo_link
    }).catch(error => {
      console.log('Error while fetching data:', error);
      return error;
    });
  }

  fetchGithubData = repo => {
    githubAPI.repo(repo).then(res => {
      const {issues, pulls} = res;
      console.log('github issues/pulls:', issues, pulls)
      this.setState({issues, pulls })
      return res;
    }).then(result => {
       return githubAPI.repoContributors(repo)
    }).then(res => {
      console.log('github contributors:', res)
      this.setState({contributors: res})
    }).catch(err => console.log('Error in github pull:', err))
  }

  renderTeamMembers = () => {
    return this.state.members.map(member => {
      member.contributions = this.state.contributors.find(c => c.name === member.github.login )
      console.log('member:', member)
      return member
    }).map(member => {
      const cons = member.contributions ? 
      {
        c: member.contributions.commits,
        a: member.contributions.additions,
        d: member.contributions.deletions
      } :
      {c: 0, a: 0, d: 0}
      return (
        <Item.Group link>
          <Item>
            <Item.Image size='mini' src={member.github.avatar_url} shape='rounded'  />
            <Item.Content>
              <Item.Header>{member.github.name}</Item.Header>
              <Item.Meta>{`${cons.c} commits / ${cons.a} ++ / ${cons.d} --`}</Item.Meta>
            </Item.Content>
          </Item>
          <Divider/>
        </Item.Group>
      )
    });
  }

  renderPendingMembers = () => {
    return this.state.pending_members.map(pending_member => (
      <Card className='projectRequest'>
        <Card.Content>
          <Image src={pending_member.github.avatar_url} shape='rounded' size='mini' verticalAlign='middle' /> <span> <strong> {pending_member.github.name} </strong> wants to join.</span>
        </Card.Content>
        <Card.Content extra>
          <div className='ui two buttons'>
            <Button fluid className='projectClose' >Decline</Button>
            <Button fluid className='projectCheck' >Approve</Button>
          </div>
        </Card.Content>
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
    return this.state[type].map( item => (
      <Item.Group>
        <Divider/>
        <Item>
          <Item.Image size='mini' as='a' href={item.author.url} src={item.author.avatarUrl} shape='rounded'  />
          <Item.Content>
            <Item.Header as='a' href={item.url}>{item.title}</Item.Header>
            <Item.Meta>State: {item.state}</Item.Meta>
          </Item.Content>
        </Item>
      </Item.Group>
    ));
  }

  panes = [
    { menuItem: 'Team Chat', render: () =>
      <Tab.Pane attached={false}>
        <Chat chat_type='private' user={this.state.userID} projectId={this.state._id}
        chats={this.state.chat.filter(chat => chat.chat_type === 'private')}  />
      </Tab.Pane> },
    { menuItem: 'Public Forum', render: () =>
      <Tab.Pane attached={false}>
        <Chat chat_type='public' user={this.state.userID} projectId={this.state._id}
        chats={this.state.chat.filter(chat => chat.chat_type === 'public')} />
      </Tab.Pane> }
  ]

  render(props) {
    return (
      <div className='projectBackground'>
        <Navbar currentPage='project' />
        <Segment textAlign='center' vertical className='projectBanner'>
          <Container text>
            <i className="devicon-angularjs-plain colored devIcon"></i>
            <Header textAlign='center' as='h1' className='projectTitle'>
            {this.state.name}
            {/* <p>Cohort: {this.props.match.params.cohort}</p>
            <p>Username: {this.props.match.params.username}</p>
            <p>Project: {this.props.match.params.project}</p> */}
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
                <Header as='h3'>Project Details</Header>
                {this.renderTechTags()}<br/><br/>
                <p>{this.state.description}</p>
                <div floated='right'>
                  <Icon link name='github' size='large' link={this.state.repo_link} />
                  <Icon link name='google' size='large' link={this.state.google_drive_link} />
                  <Icon link name='trello' size='large' link={this.state.trello_link}  />
                </div>
                <Segment>
                  <Header>{formatDate(this.state.start_date)}</Header>
                  <p>Projected Start Date</p>
                </Segment>
                <Segment>
                  <Header>{this.state.duration} weeks </Header>
                  <p>Project Length</p>
                </Segment>
                <Segment>
                  <Header>{this.state.members_wanted} members</Header>
                  <p>Team Size</p>
                </Segment>
              </Segment>

              <Segment basic className='projectChat'>
                <Tab menu={{ secondary: true, pointing: true }} panes={this.panes}/>
              </Segment>

              <Rail position='left'>

                <Segment className='pullRequest'>
                  <Header as='h3'>Pull Requests</Header>
                  {this.renderPRorIssue('pulls')}
                </Segment>

                <Segment className='pullRequest'>
                  <Header as='h3'>Issues</Header>
                  {this.renderPRorIssue('issues')}
                </Segment>

                <Card.Group>
                  <Card className='projectSegment'>
                    <Card.Content>
                      <Header as='h3'>Project Details</Header>
                      <p>{this.state.description}</p>
                      <div floated='right'>
                        <Icon link name='github' size='large' link={this.state.repo_link} />
                        <Icon link name='google' size='large' link={this.state.google_drive_link} />
                        <Icon link name='trello' size='large' link={this.state.trello_link}  />
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
                    <Card.Content extra>
                        <Button fluid className='projectCheck' > View Live Demo </Button>
                    </Card.Content>
                  </Card>
                </Card.Group>
              </Rail>

              <Rail position='right'>
                <Segment className='joinRequest'>
                    <Button fluid className='projectJoin' link={this.state.deploy_link}>Request to Join!</Button>
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
