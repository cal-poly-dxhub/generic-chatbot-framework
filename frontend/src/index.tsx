/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { NorthStarThemeProvider } from '@aws-northstar/ui';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import Auth from './Auth';
import { ApiProvider } from './providers/ApiProvider';
import { AppLayoutProvider } from './providers/AppLayoutProvider';
import { FlagsProvider } from './providers/FlagsProvider';
import { WsApiProvider } from './providers/WebSocketApiProvider';
import reportWebVitals from './reportWebVitals';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NorthStarThemeProvider>
      <BrowserRouter>
        <Auth>
          <FlagsProvider>
            <ApiProvider>
              <WsApiProvider>
                <AppLayoutProvider>
                  <App />
                </AppLayoutProvider>
              </WsApiProvider>
            </ApiProvider>
          </FlagsProvider>
        </Auth>
      </BrowserRouter>
    </NorthStarThemeProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
