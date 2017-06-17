    var accountSid = process.env.ACCOUNT_SID;
    var authToken = process.env.AUTH_TOKEN;

    var customerNumber = "+18608784432";
    var sourceNumber = "+19592005692";
    var msg = intent.slots.Reminder.value ? intent.slots.Reminder.value : "no reminder received";
    var client = require('twilio')(accountSid, authToken);
    client.messages.create({
        to: customerNumber,
        from: sourceNumber,
        body: msg,
    }, function(err, message) {
        var msg = err ? "sorry, something went wrong" : "text sent!"
        callback(session.attributes, buildSpeechletResponseWithoutCard(msg, "", "true"));
    });