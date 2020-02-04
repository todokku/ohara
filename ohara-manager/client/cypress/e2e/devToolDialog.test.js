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

import { deleteAllServices } from '../utils';

const displayWorkspaceName = Cypress.env('servicePrefix')
  .substring(0, 2)
  .toUpperCase();

describe('Topics tab', () => {
  before(async () => await deleteAllServices());

  it('empty topic list', () => {
    // Close the quickstart dialog
    cy.visit('/');
    cy.findByTestId('close-intro-button').click();

    // App bar is visible
    cy.findByTitle('Create a new workspace').should('be.visible');

    cy.findByTitle('Developer Tools')
      .click()
      .findByText(/topics/i)
      .should('exist');

    // check the topic Select component
    cy.findByTitle('Select topic')
      .should('have.length', 1)
      .click()
      .get('ul')
      .should('be.empty');
  });

  it('with an exist workspace, topic list of devTool should work normally', () => {
    cy.createServices({
      withWorkspace: true,
      withTopic: true,
    }).then(res => {
      cy.produceTopicData(res.workspaceName, res.topic)
        .visit('/', {
          onBeforeLoad(win) {
            // to surveillance the window.open() event
            // we stub it and do nothing
            cy.stub(win, 'open');
          },
        })
        .findByText(displayWorkspaceName)
        .should('exist');

      // Check the topic tab exist
      cy.findByTitle('Developer Tools')
        .click()
        .findByTitle('Select topic')
        .click()
        .findByText(res.topic.name)
        .click();

      // Check the status bar of no data
      cy.findByText('No topic data').should('exist');

      // Check the topic data detail view
      cy.findByTestId('view-topic-table')
        .should('exist')
        .get('tbody tr')
        .should('have.length.greaterThan', 0)
        .findByTestId('detail-view-icon-0')
        .click();

      // Check the status bar
      cy.findByText('10 rows per query').should('exist');

      // the detail view should exist
      cy.findByTestId('topic-detail-view')
        .should('exist')
        .find('button')
        .click();

      // refresh button
      cy.findByTitle('Fetch the data again')
        .click()
        .get('table')
        .should('exist');

      // query button
      cy.findByTitle('Query with different parameters')
        .click()
        .findByText('QUERY')
        .click()
        .get('table')
        .should('exist');
      cy.findByText('Rows per query')
        .parent()
        .find('input[type=number]')
        .first()
        .type('{esc}');

      // open new window button
      cy.findByTitle('Open in a new window').click();
      cy.window()
        .its('open')
        .should('be.called');

      // close button
      cy.findByTitle('Close this panel').click();
    });
  });
});

describe('Logs tab', () => {
  before(async () => await deleteAllServices());

  it('with an exist workspace, configurator log of devTool should work normally', () => {
    cy.createServices({
      withWorkspace: true,
    }).then(() => {
      cy.visit('/', {
        onBeforeLoad(win) {
          // to surveillance the window.open() event
          // we stub it and do nothing
          cy.stub(win, 'open');
        },
      })
        .findByText(displayWorkspaceName)
        .should('exist');

      // Check the log tab exist
      cy.findByTitle('Developer Tools')
        .click()
        .findByText(/logs/i)
        .click();

      // Check the status bar of no data
      cy.findByText('No log data').should('exist');

      // Check the logType dropdown list
      cy.findByTestId('log-type-select').click();

      // Check the log data of configurator
      cy.findByText('configurator').click();
      cy.findByTestId('view-log-list').should('exist');

      // Check the status bar
      cy.findByText('Latest 10 minutes').should('exist');

      // refresh button
      cy.get('span[title="Fetch the data again"] > button:enabled')
        .click()
        .findByTestId('view-log-list')
        .should('exist');

      // query button
      cy.get(
        'span[title="Query with different parameters"] > button:enabled',
      ).click();
      cy.findByTestId('log-query-popover')
        .find('button')
        .click()
        .findByTestId('view-log-list')
        .should('exist');
      cy.findByText('Minutes per query')
        .parent()
        .find('input[type=number]')
        .first()
        .type('{esc}');

      // open new window button
      cy.findByTitle('Open in a new window').click();
      cy.window()
        .its('open')
        .should('be.called');

      // close button
      cy.findByTitle('Close this panel').click();
    });
  });
});