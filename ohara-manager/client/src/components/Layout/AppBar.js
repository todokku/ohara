/*
 * Copyright 2019 is-land
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { get, isEmpty } from 'lodash';
import Tooltip from '@material-ui/core/Tooltip';
import AppsIcon from '@material-ui/icons/Apps';
import DeveloperModeIcon from '@material-ui/icons/DeveloperMode';
import AssignmentIcon from '@material-ui/icons/Assignment';
import StorageIcon from '@material-ui/icons/Storage';
import AddIcon from '@material-ui/icons/Add';
import { Link } from 'react-router-dom';

import { useNewWorkspace } from 'context/NewWorkspaceContext';
import { useWorkspace } from 'context';
import { useNodeDialog } from 'context/NodeDialogContext';
import { useDevToolDialog } from 'context/DevToolDialogContext';

// Import this logo as a React component
// https://create-react-app.dev/docs/adding-images-fonts-and-files/#adding-svgs
import { ReactComponent as Logo } from 'images/logo.svg';
import { Header, Tools, WorkspaceList, StyledNavLink } from './Styles';

// Since Mui doesn't provide a vertical AppBar, we're creating our own
// therefore, this AppBar has nothing to do with Muis
const AppBar = () => {
  const { workspaceName } = useParams();
  const {
    workspaces,
    currentWorkspace,
    findByWorkspaceName,
    setCurrentWorkspace,
  } = useWorkspace();

  const { setIsOpen: setIsNewWorkspaceOpen } = useNewWorkspace();
  const { setIsOpen: setIsNodeDialogOpen } = useNodeDialog();
  const { setIsOpen: setIsDevToolDialogOpen } = useDevToolDialog();

  React.useEffect(() => {
    if (isEmpty(workspaceName) || isEmpty(workspaces)) return;
    if (get(currentWorkspace, 'settings.name') === workspaceName) return;
    const workspaceFound = findByWorkspaceName(workspaceName);
    setCurrentWorkspace(workspaceFound);
  }, [
    workspaces,
    currentWorkspace,
    findByWorkspaceName,
    setCurrentWorkspace,
    workspaceName,
  ]);

  return (
    <>
      <Header>
        <div className="brand">
          <Link to="/">
            <Logo width="38" height="38" />
          </Link>
        </div>
        <WorkspaceList>
          {workspaces.map(worker => {
            const { name } = worker.settings;
            const displayName = name.substring(0, 2).toUpperCase();

            return (
              <Tooltip
                key={name}
                title={name}
                placement="right"
                enterDelay={1000}
              >
                <StyledNavLink
                  activeClassName="active-link"
                  className="workspace-name item"
                  to={`/${name}`}
                >
                  {displayName}
                </StyledNavLink>
              </Tooltip>
            );
          })}

          <Tooltip
            title="Create a new workspace"
            placement="right"
            enterDelay={1000}
          >
            <div
              className="add-workspace item"
              onClick={() => setIsNewWorkspaceOpen(true)}
            >
              <AddIcon />
            </div>
          </Tooltip>
        </WorkspaceList>

        <Tools>
          <AppsIcon className="workspace item" />
          <AssignmentIcon className="item" />
          <DeveloperModeIcon
            className="item"
            onClick={() => setIsDevToolDialogOpen(true)}
          />
          <StorageIcon
            className="nodes item"
            onClick={() => setIsNodeDialogOpen(true)}
          />
        </Tools>
      </Header>
    </>
  );
};

export default AppBar;
