#!/bin/bash

npm install
npm run build 
npm run cdk bootstrap
npm run cdk deploy -- --parameters adminUserEmail=$ADMIN_EMAIL --verbose --require-approval never
