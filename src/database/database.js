var mongoose = require('mongoose')

module.exports = {
    connectIfNeeded: function() {
        if (mongoose.connections > 0) {
            return
        }
        let mongoDB = process.env.MONGODB_BOOKMARK_CONNECTION_STRING
        mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
    
        //Get the default connection
        var db = mongoose.connection;
    
        //Bind connection to error event (to get notification of connection errors)
        db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    },
    urlValidator: function(val) {
        // null inputs are OK
        if (!val || val === '') { return true }
        let urlRegex = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
        return urlRegex.test(val);
    }
}