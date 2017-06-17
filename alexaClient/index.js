'use strict';

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);
        
        // security check
        if (event.session.application.applicationId !== "amzn1.ask.skill.296890ad-f8bf-4659-83f8-d33cfc0bb631") {
            context.fail("Invalid Application ID");
         }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    var cardTitle = "Hello, World!"
    var speechOutput = "You can tell Hello, World! to say Hello, World!"
    callback(session.attributes,
        buildSpeechletResponse(cardTitle, speechOutput, "", true));
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here
    if (intentName == 'SetReminder') {
        handleSetReminderRequest(intent, session, callback);
    }
    else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // Add any cleanup logic here
}

function handleSetReminderRequest(intent, session, callback) {
    var reminderDateTime, reminderDateTimeString;
    var reminderContent = intent.slots.ReminderContent.value;
    var duration = intent.slots.Duration.value,
        date = intent.slots.Date.value,
        time = intent.slots.Time.value;
    var msg = "";

    // if no reminder, quit
    // to do: in this case, ask again for the reminder
    if (!reminderContent) {
       msg = "sorry, I didn't catch what you wanted to remember.";
       callback(session.attributes, buildSpeechletResponseWithoutCard(msg, "", "true"));
    }

    // parse time, and add an entry to DB with content and time
    var moment = require("moment");
    var Guid = require('guid');
    var time_zone_offset = moment.duration("PT7H");          // assume user is in PST, increment time by 7 hours

    // if duration, only consider duration
    if (duration) {
        var now = moment();
        var duration = moment.duration(duration);
        reminderDateTime = now.add(duration);
        reminderDateTimeString = reminderDateTime.subtract(time_zone_offset).calendar();      // string for display
        reminderDateTime.add(time_zone_offset); 
        msg = "Okay, I will remind you to " + reminderContent + " on " + reminderDateTimeString;
    
    // else, construct from date or time
    } else {
        time = time ? time : "08";                          // if no time provided, assume 8 AM
        // infer date based on time
        if (!date) {
            var todayString = moment().format("YYYY-MM-DD") + " " + time;
            var todayMoment = moment(todayString, "YYYY-MM-DD HH:mm").add(time_zone_offset);
            // if today + hour is in the past, then increment date by 24 hours
            if (todayMoment < moment()) {
                todayMoment.add(moment.duration("PT24H"));
            }
            todayMoment.subtract(time_zone_offset);
            date = todayMoment.format("YYYY-MM-DD");
        }
        var datetimeString = date + " " + time;
        reminderDateTime = moment(datetimeString, "YYYY-MM-DD HH:mm")
        reminderDateTimeString = reminderDateTime.calendar();       // read out the PST time...
        reminderDateTime = reminderDateTime.add(time_zone_offset);  // ...but record the GMT time 
        msg = "Okay, I will remind you to " + reminderContent + " on " + reminderDateTimeString;
    }

    // set up DB
    var AWS = require('aws-sdk');
    var dynamoDBConfiguration = {
        "accessKeyId": process.env.ADMIN_ACCESS_KEY,
        "secretAccessKey": process.env.SECRET_ACCESS_KEY,
        "region": "us-east-1"
      };
    AWS.config.update(dynamoDBConfiguration);
    var dd = new AWS.DynamoDB();
    var tableName = 'rt2';

    var params = {
        Item: {
            "key": { S: Guid.create().value },
            "reminderTime": { N: reminderDateTime.unix().toString() },
            "reminderContent": { S: reminderContent },
            "Sent": { N: "0" },
            "UserID": { N: "0" }
        }, 
        ReturnConsumedCapacity: "TOTAL", 
        TableName: tableName
    };

    // add entry to DB
    dd.putItem(params, function(err, data) {
        if (err) {
            // an error occurred
            console.log(err, err.stack);
            msg = "sorry, something went wrong"
            callback(session.attributes, buildSpeechletResponseWithoutCard(msg, "", "true"));
        } else {
            // successful response
            callback(session.attributes, buildSpeechletResponseWithoutCard(msg, "", "true"));
            console.log(data);
        }           
    });

}

// ------- Helper functions to build responses -------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}