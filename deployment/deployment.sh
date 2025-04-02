#!/bin/bash

bash deployment/resources.sh

read -p "Do you want to run the document ingestion pipeline? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    bash deployment/ingestion.sh
fi
