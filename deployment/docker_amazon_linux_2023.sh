#!/bin/bash

# This script installs Docker and docker-compose on Amazon Linux 2023

sudo dnf install -y docker-25.0.8-1.amzn2023.0.1
sudo systemctl start docker
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo curl -L "https://github.com/docker/compose/releases/download/v2.34.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
