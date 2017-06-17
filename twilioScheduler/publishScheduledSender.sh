rm twilioScheduler.zip
echo "removed old zip file, zipping new file"
zip -r twilioScheduler .zip node_modules/ twilioScheduler.js > /dev/null
echo "zip completed, starting upload"
aws lambda update-function-code --function-name alexaReminder_twilioHelper --zip-file fileb://twilioScheduler.zip