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
import PropTypes from 'prop-types';
import { useSnackbar } from 'context/SnackbarContext';
import { fetchConfiguratorCreator } from './configuratorActions';
import { reducer, initialState } from './configuratorReducer';

const ConfiguratorStateContext = React.createContext();
const ConfiguratorDispatchContext = React.createContext();

const ConfiguratorProvider = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const showMessage = useSnackbar();

  const fetchConfigurator = React.useCallback(
    fetchConfiguratorCreator(state, dispatch, showMessage),
    [state],
  );

  React.useEffect(() => {
    fetchConfigurator();
  }, [fetchConfigurator]);

  return (
    <ConfiguratorStateContext.Provider value={state}>
      <ConfiguratorDispatchContext.Provider value={dispatch}>
        {children}
      </ConfiguratorDispatchContext.Provider>
    </ConfiguratorStateContext.Provider>
  );
};

ConfiguratorProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

const useConfiguratorState = () => {
  const context = React.useContext(ConfiguratorStateContext);
  if (context === undefined) {
    throw new Error(
      'useConfiguratorState must be used within a ConfiguratorProvider',
    );
  }
  return context;
};

export { ConfiguratorProvider, useConfiguratorState };
