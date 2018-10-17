import React from 'react';
import styled from 'styled-components';
import DocumentTitle from 'react-document-title';
import toastr from 'toastr';
import { Route, Redirect } from 'react-router-dom';
import { v4 as uuid4 } from 'uuid';

import * as _ from 'utils/helpers';
import * as MESSAGES from 'constants/messages';
import PipelineSourcePage from './PipelineSourcePage';
import PipelineSourceFtpPage from './PipelineSourceFtpPage';
import PipelineTopicPage from './PipelineTopicPage';
import PipelineSinkPage from './PipelineSinkPage';
import Toolbar from './Toolbar';
import PipelineGraph from './PipelineGraph';
import Editable from './Editable';
import { ConfirmModal } from 'common/Modal';
import { deleteBtn } from 'theme/btnTheme';
import { Button } from 'common/Form';
import { fetchTopic } from 'apis/topicApis';
import { H2 } from 'common/Headings';
import { PIPELINE } from 'constants/urls';
import { PIPELINE_NEW } from 'constants/documentTitles';
import {
  fetchPipeline,
  deletePipeline,
  updatePipeline,
} from 'apis/pipelinesApis';

const Wrapper = styled.div`
  padding: 100px 30px 0 240px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
`;

const Actions = styled.div`
  margin-left: auto;
`;

class PipelineNewPage extends React.Component {
  state = {
    topicName: '',
    graph: [],
    isRedirect: false,
    isLoading: true,
    isModalActive: false,
    hasChanges: false,
    pipelines: {},
  };

  iconMaps = {
    source: 'fa-database',
    topic: 'fa-list-ul',
    sink: 'icon-hadoop',
  };

  componentDidMount() {
    const isValid = this.checkTopicId(this.props.match);

    if (isValid) {
      this.fetchData();
    }
  }

  componentDidUpdate() {
    if (this.state.hasChanges) {
      this.save();
    }
  }

  fetchData = async () => {
    const { match } = this.props;
    const topicId = _.get(match, 'params.topicId', null);
    const pipelineId = _.get(match, 'params.pipelineId', null);

    const fetchTopicsPromise = this.fetchTopics(topicId);
    const fetchPipelinePromise = this.fetchPipeline(pipelineId);

    Promise.all([fetchTopicsPromise, fetchPipelinePromise]);
  };

  fetchTopics = async topicId => {
    if (!_.isUuid(topicId)) return;

    const res = await fetchTopic(topicId);
    this.setState(() => ({ isLoading: false }));

    const result = _.get(res, 'data.result', null);

    if (!_.isNull(result)) {
      this.setState({ topicName: result.name });
    }
  };

  fetchPipeline = async pipelineId => {
    if (!_.isUuid(pipelineId)) return;

    const res = await fetchPipeline(pipelineId);
    const pipelines = _.get(res, 'data.result', null);

    if (pipelines) {
      this.setState({ pipelines });
    }
  };

  checkTopicId = match => {
    const topicId = _.get(match, 'params.topicId', null);
    const isValid = !_.isNull(topicId) && _.isUuid(topicId);

    if (!isValid) {
      toastr.error(MESSAGES.TOPIC_ID_REQUIRED_ERROR);
      this.setState(() => ({ isRedirect: true }));
      return false;
    }

    return true;
  };

  updateGraph = (update, id) => {
    this.setState(({ graph }) => {
      const idx = graph.findIndex(g => g.id === id);
      let _graph = [];

      if (idx === -1) {
        _graph = [...graph, update];
      } else {
        _graph = [
          ...graph.slice(0, idx),
          { ...graph[idx], ...update },
          ...graph.slice(idx + 1),
        ];
      }
      return {
        graph: _graph,
      };
    });
  };

  loadGraph = pipelines => {
    if (!pipelines) return;

    const { objects, rules } = pipelines;
    const { graph } = this.state;

    const _graph = objects.map(({ kind: type, uuid, name }, idx) => {
      return {
        name,
        type,
        uuid,
        icon: this.iconMaps[type],
        id: graph[idx] ? graph[idx].id : uuid4(),
        isActive: graph[idx] ? graph[idx].isActive : false,
        to: '?',
      };
    });

    const forms = Object.keys(rules);

    const results = forms.map(form => {
      const source = _graph.filter(g => g.uuid === form);
      const target = _graph.filter(g => g.uuid === rules[form]);

      return {
        ...source[0],
        to: target[0] ? target[0].id : '',
      };
    });

    this.setState(
      () => {
        return { graph: _graph };
      },
      () => {
        results.forEach(result => this.updateGraph(result, result.id));
      },
    );
  };

  resetGraph = () => {
    this.setState(({ graph }) => {
      const update = graph.map(g => {
        return { ...g, isActive: false };
      });

      return {
        graph: update,
      };
    });
  };

  handlePipelineTitleChange = ({ target: { value: title } }) => {
    this.setState(({ pipelines }) => {
      const _pipelines = { ...pipelines, name: title };
      return { hasChanges: true, pipelines: _pipelines };
    });
  };

  handleModalOpen = () => {
    this.setState({ isModalActive: true });
  };

  handleModalClose = () => {
    this.setState({ isModalActive: false });
  };

  handlePipelineDelete = async () => {
    const pipelineId = _.get(this.props.match, 'params.pipelineId', null);
    const res = await deletePipeline(pipelineId);
    const isSuccess = _.get(res, 'data.isSuccess', false);

    if (isSuccess) {
      toastr.success(MESSAGES.PIPELINE_DELETION_SUCCESS);
      this.setState(() => ({ isRedirect: true }));
    }
  };

  updateHasChanges = update => {
    this.setState({ hasChanges: update });
  };

  save = _.debounce(async () => {
    const { name, uuid, rules } = this.state.pipelines;
    const params = {
      name,
      rules,
    };

    const res = await updatePipeline({ uuid, params });
    const pipelines = _.get(res, 'data.result', []);

    if (!_.isEmpty(pipelines)) {
      this.setState({ pipelines });
    }
  }, 1000);

  render() {
    const {
      isLoading,
      graph,
      isRedirect,
      topicName,
      isModalActive,
      hasChanges,
      pipelines,
    } = this.state;

    const pipelineTitle = _.get(pipelines, 'name', null);

    if (isRedirect) {
      return <Redirect to={PIPELINE} />;
    }

    if (!pipelineTitle) {
      return null;
    }

    return (
      <DocumentTitle title={PIPELINE_NEW}>
        <React.Fragment>
          <ConfirmModal
            isActive={isModalActive}
            title="Delete pipeline?"
            confirmBtnText="Yes, Delete this pipeline"
            cancelBtnText="No, Keep it"
            handleCancel={this.handleModalClose}
            handleConfirm={this.handlePipelineDelete}
            message="Are you sure you want to delete this pipeline? This action cannot be redo!"
            isDelete
          />

          <Wrapper>
            <Header>
              <H2>
                <Editable
                  title={pipelineTitle}
                  handleChange={this.handlePipelineTitleChange}
                />
              </H2>

              <Actions>
                <Button
                  theme={deleteBtn}
                  text="Delete pipeline"
                  data-testid="delete-pipeline-btn"
                  handleClick={this.handleModalOpen}
                />
              </Actions>
            </Header>
            <Toolbar
              {...this.props}
              iconMaps={this.iconMaps}
              updateGraph={this.updateGraph}
              graph={graph}
              hasChanges={hasChanges}
            />
            <PipelineGraph
              {...this.props}
              graph={graph}
              updateGraph={this.updateGraph}
              updateG={this.updateG}
              resetGraph={this.resetGraph}
            />

            <Route
              path="/pipeline/(new|edit)/source"
              render={() => (
                <PipelineSourcePage
                  {...this.props}
                  graph={graph}
                  loadGraph={this.loadGraph}
                  updateGraph={this.updateGraph}
                  hasChanges={hasChanges}
                  updateHasChanges={this.updateHasChanges}
                />
              )}
            />

            <Route
              path="/pipeline/(new|edit)/source-ftp"
              render={() => (
                <PipelineSourceFtpPage
                  {...this.props}
                  graph={graph}
                  loadGraph={this.loadGraph}
                  updateGraph={this.updateGraph}
                  hasChanges={hasChanges}
                  updateHasChanges={this.updateHasChanges}
                />
              )}
            />
            <Route
              path="/pipeline/(new|edit)/topic"
              render={() => (
                <PipelineTopicPage
                  {...this.props}
                  graph={graph}
                  loadGraph={this.loadGraph}
                  updateGraph={this.updateGraph}
                  isLoading={isLoading}
                  name={topicName}
                />
              )}
            />
            <Route
              path="/pipeline/(new|edit)/sink"
              render={() => (
                <PipelineSinkPage
                  {...this.props}
                  graph={graph}
                  hasChanges={hasChanges}
                  loadGraph={this.loadGraph}
                  updateGraph={this.updateGraph}
                  updateHasChanges={this.updateHasChanges}
                />
              )}
            />
          </Wrapper>
        </React.Fragment>
      </DocumentTitle>
    );
  }
}

export default PipelineNewPage;
