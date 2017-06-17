rm index.zip
echo "removed old zip file, zipping new file"
zip -r index.zip node_modules/ index.js > /dev/null
echo "zip completed, starting upload"
aws lambda update-function-code --function-name alexaSMS --zip-file fileb://index.zip