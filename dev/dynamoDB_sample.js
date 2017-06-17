var AWS = require('aws-sdk');
var dynamoDBConfiguration = {
    "accessKeyId": "",
    "secretAccessKey": "",
    "region": "us-east-1"
  };
AWS.config.update(dynamoDBConfiguration);
var dd = new AWS.DynamoDB();
var tableName = 'rt2';

addRow = function() {

   var params = {
    Item: {
     "reminderTime": {
        S: "2017-02-11 04"
      }, 
      "reminderContent": {
        S: "call doctor's office 3"
      }
    }, 
    ReturnConsumedCapacity: "TOTAL", 
    TableName: tableName
   };

   dd.putItem(params, function(err, data) {
     if (err) console.log(err, err.stack); // an error occurred
     else     console.log(data);           // successful response
   });
 }

getRow = function() {
  var params = {
    Key: {
     "reminderTime": {
        S: "2017-02-11 04"
      }
    }, 
    TableName: tableName
   };
  dd.getItem(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
}

scanRows = function() {
  var params = {
    ExpressionAttributeValues: {
      ":start": {
        N: "1496048399"
      },
      ":end": {
        N: "1497490992"
      }
    }, 
    FilterExpression: "reminderTime BETWEEN :start AND :end",
    TableName: tableName
  };
  dd.scan(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
}

scanRows();

var Guid = require('guid');
console.log(Guid.create().value);

// proposed logic:
// on receiving a request, store UNIX timestamp for each row
// worker job saves the "last checked time" as UNIX timestamp 
// worker job spins up 15m, and checks for all reminders between "last checked time" and "current time + 15m"
// worker job gets all reminders, and sends them out