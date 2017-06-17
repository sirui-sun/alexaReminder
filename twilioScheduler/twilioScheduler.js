'use strict';
var moment = require('moment');
var AWS = require('aws-sdk');
var Promise = require("promise");
var dynamoDBConfiguration = {
    "accessKeyId": process.env.ADMIN_ACCESS_KEY,
    "secretAccessKey": process.env.SECRET_ACCESS_KEY,
    "region": "us-east-1"
  };

AWS.config.update(dynamoDBConfiguration);
var LAST_RUN_TABLE_NAME = "lastRunTime";
var REMINDER_TABLE_NAME = "rt2";

// scheduled job to read from DB and execute Twilio statements
exports.handler = function (event, context) {

	var lastRunTimePromise = getLastRunTimePromise();

	// get all reminder jobs from the DB between those two times which haven't been run
	lastRunTimePromise
		.then(getAllReminders, handleError)
		.then(callTwilio, handleError)
		.then(updateLastRunTime, handleError)
		.then(handleError, handleError);

}

// return UNIX timestamp of the time fifteen minutes from now
var inFifteenMinutes = function() {
    return moment().add(moment.duration("PT15M")).unix();
}

// Query DB for when this job was last run
var getLastRunTimePromise = function() {
	return new Promise((resolve, reject) => {
		var lastRunDB = new AWS.DynamoDB();
		var params = {
		    Key: {
		     "key": {
		        S: "1"
		      }
		    }, 
		    TableName: LAST_RUN_TABLE_NAME
		 };
		
		lastRunDB.getItem(params, function(err, data) {
		    if (err) {
		    	console.log(err)
		    	reject(err);
		    } else {
		    	try { resolve(data.Item.time.N); }
		    	catch (err) { console.log(err); reject(err); } 
		    }           
		});
	});
}

// Get all reminders between last run and 15 minutes in the future
var getAllReminders = function(data) {
  
	var inFifteenMinutesUnix = inFifteenMinutes().toString();
	var lastCheckedUnix = data.toString();
	var reminderDB = new AWS.DynamoDB();

	var params = {
		ExpressionAttributeValues: {
		  ":start": { N: lastCheckedUnix },
		  // ":start": { N: "0" },
		  ":end": { N: inFifteenMinutesUnix }
		}, 
		FilterExpression: "reminderTime BETWEEN :start AND :end",
		TableName: REMINDER_TABLE_NAME
	};

	return new Promise((resolve, reject) => {
		reminderDB.scan(params, function(err, data) {
			if (err) {
				console.log("err" + err);
				reject(err); // an error occurred
			} else { 
				resolve([data, inFifteenMinutesUnix]);
			}           // successful response
		});
	});
}

var callTwilio = function(data) {
	var remindersData = data[0];
	var scanTime = data[1];
	// set up
	var accountSid = process.env.TWILIO_ACCOUNT_SID;
	var authToken = process.env.TWILIO_AUTH_TOKEN;
	var customerNumber = "+18608784432";
	var sourceNumber = "+19592005692";
	var client = require('twilio')(accountSid, authToken);

	// send out all reminder texts
	var reminders = remindersData.Items
	for (var i=0; i<reminders.length; i++) {
		var reminderContent = generateReminderString(reminders[i].reminderContent.S);

	    client.messages.create({
	        to: customerNumber,
	        from: sourceNumber,
	        body: reminderContent,
	    }, function(err, message) {
	        console.log("err: " + err);
	        console.log("message: " + message);
	    });
	}

	return scanTime;
}

var updateLastRunTime = function(data) {
	var scanTime = data;

	var lastRunDB = new AWS.DynamoDB();
	var params = {
	    Item: {
	    	"key": {
	        	S: "1"
	      	},
	      	"time": {
	      		N: scanTime
	      	}
	    }, 
	    TableName: LAST_RUN_TABLE_NAME
	 };

	lastRunDB.putItem(params, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
		else     console.log(data);           // successful response
	});
}

var generateReminderString = function(reminderContent) {
	return "Reminder: " + reminderContent;
}

var handleError = function(data) {
	console.log(data);
}

var lastRunTimePromise = getLastRunTimePromise();
lastRunTimePromise
	.then(getAllReminders, handleError)
	.then(callTwilio, handleError)
	.then(updateLastRunTime, handleError)
	.then(handleError, handleError);