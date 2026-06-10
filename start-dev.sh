#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://bnbstake:npg_jNY8Hka6iJGc@ep-dawn-cloud-ai27xf2d-pooler.c-4.us-east-1.aws.neon.tech/bnbstake?sslmode=require"
export DIRECT_URL="postgresql://bnbstake:npg_jNY8Hka6iJGc@ep-dawn-cloud-ai27xf2d.c-4.us-east-1.aws.neon.tech/bnbstake?sslmode=require"
while true; do
  npx next dev -p 3000
  echo "Server crashed, restarting in 3s..."
  sleep 3
done
