// var date = "2017-05-29";
// var time = "17:30";
// var combined = date + " " + time;

// var setTime = moment(combined, "YYYY-MM-DD HH:mm");
// console.log(setTime);

var moment = require("moment");
now = moment().local().format("YYYY-MM-DD HH:mm");
console.log(now);