:
ng build --prod && npm run post-build
zip -rqq dist-v1.zip dist; scp dist-v1.zip dc2-confmgr1:/var/tmp/frontend/
