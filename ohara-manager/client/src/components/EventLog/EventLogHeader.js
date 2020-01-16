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

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';

import CloseIcon from '@material-ui/icons/Close';
import DeleteSweepIcon from '@material-ui/icons/DeleteSweep';
import SettingsIcon from '@material-ui/icons/Settings';

import { Tooltip } from 'components/common/Tooltip';
import {
  useEventLogActions,
  useEventLogDialog,
  useEventLogState,
} from 'context';
import Wrapper from './EventLogHeaderStyles';

const EventLogHeader = () => {
  const { clearEventLogs } = useEventLogActions();
  const { data: logs } = useEventLogState();
  const { close } = useEventLogDialog();

  return (
    <Wrapper>
      <AppBar position="static" color="default">
        <Toolbar variant="dense">
          <Typography variant="h6" noWrap className="title">
            Event Logs
          </Typography>
          <Tooltip title="Clear event logs">
            <IconButton
              color="default"
              onClick={clearEventLogs}
              disabled={!logs || logs.length === 0}
            >
              <DeleteSweepIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Event logs settings">
            <IconButton color="default">
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close event logs">
            <IconButton color="default" onClick={close}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
    </Wrapper>
  );
};

export default EventLogHeader;