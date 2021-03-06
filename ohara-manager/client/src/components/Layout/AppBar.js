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
import { NavLink } from 'react-router-dom';
import { get, isEmpty } from 'lodash';
import AppsIcon from '@material-ui/icons/Apps';
import DeveloperModeIcon from '@material-ui/icons/DeveloperMode';
import AssignmentIcon from '@material-ui/icons/Assignment';
import StorageIcon from '@material-ui/icons/Storage';
import AddIcon from '@material-ui/icons/Add';
import IconButton from '@material-ui/core/IconButton';
import Badge from '@material-ui/core/Badge';

import * as context from 'context';
import * as hooks from 'hooks';
import { WorkspaceList as ListWorkspacesDialog } from 'components/Workspace';
import { ReactComponent as Logo } from 'images/logo.svg';
import { StyledAppBar } from './AppBarStyles';
import { Tooltip } from 'components/common/Tooltip';

// Since Mui doesn't provide a vertical AppBar, we're creating our own
// therefore, this AppBar has nothing to do with Muis
const AppBar = () => {
  const workspaces = hooks.useAllWorkspaces();
  const { setIsOpen: setIsNewWorkspaceOpen } = context.useNewWorkspace();
  const { toggle: toggleNodeList } = context.useListNodeDialog();
  const {
    toggle: toggleDevTool,
    close: closeDevTool,
  } = context.useDevToolDialog();
  const {
    toggle: toggleEventLog,
    close: closeEventLog,
  } = context.useEventLogDialog();
  const { toggle: toggleWorkspaceList } = context.useListWorkspacesDialog();
  const eventLogState = context.useEventLogState();

  return (
    <StyledAppBar>
      <header>
        <div className="brand">
          <Logo width="38" height="38" />
        </div>
        <div className="workspace-list">
          {workspaces.map(({ name }) => {
            const displayName = name.substring(0, 2).toUpperCase();

            return (
              <Tooltip key={name} title={name} placement="right">
                <NavLink
                  activeClassName="active-link"
                  className="workspace-name item"
                  to={`/${name}`}
                >
                  {displayName}
                </NavLink>
              </Tooltip>
            );
          })}

          <Tooltip title="Create a new workspace" placement="right">
            <div
              className="add-workspace item"
              onClick={() => setIsNewWorkspaceOpen(true)}
            >
              <AddIcon />
            </div>
          </Tooltip>
        </div>

        <div className="tools">
          <Tooltip title="Workspace list" placement="right">
            <IconButton
              className="workspace-list item"
              onClick={() =>
                isEmpty(workspaces)
                  ? setIsNewWorkspaceOpen(true)
                  : toggleWorkspaceList()
              }
            >
              <AppsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Event logs" placement="right">
            <IconButton
              className="event-logs item"
              onClick={() => {
                toggleEventLog();
                closeDevTool();
              }}
            >
              <Badge
                badgeContent={get(eventLogState, 'notifications.data.error', 0)}
                color="secondary"
              >
                <AssignmentIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Developer Tools" placement="right">
            <IconButton
              className="developer-tools item"
              onClick={() => {
                toggleDevTool();
                closeEventLog();
              }}
            >
              <DeveloperModeIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Node list" placement="right">
            <IconButton className="node-list item" onClick={toggleNodeList}>
              <StorageIcon />
            </IconButton>
          </Tooltip>
        </div>
      </header>

      <ListWorkspacesDialog />
    </StyledAppBar>
  );
};

export default AppBar;
