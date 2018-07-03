#!/bin/bash
sudo apt-get install -y mc curl git-core build-essential
sudo su vagrant -c 'curl -L https://raw.github.com/creationix/nvm/master/install.sh | sh'
sudo su vagrant -c '. ~vagrant/.nvm/nvm.sh; nvm install 10'
sudo su vagrant -c '. ~vagrant/.nvm/nvm.sh;nvm use 10'
sudo su vagrant -c '. ~vagrant/.nvm/nvm.sh;nvm alias default 10'
