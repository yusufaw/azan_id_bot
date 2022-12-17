#!/bin/sh
ssh -tt $DIGI_O_USERNAME@$DIGI_O_IP << ENDSSH
   cd /home/$DIGI_O_USERNAME/workspace/azan_id_bot/
   git pull origin main
   npm install
   pm2 restart azan_id_bot
   exit
ENDSSH