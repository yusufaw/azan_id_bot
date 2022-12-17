#!/bin/sh
ssh -tt fi0smith@$DIGI_IP << ENDSSH
   cd /home/fi0smith/workspace/azan_id_bot/
   git pull origin main
   npm install
   pm2 restart all
   exit
ENDSSH