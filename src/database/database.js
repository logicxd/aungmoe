var mongoose = require('mongoose')
var path = require('path');
var appDir = path.dirname(require.main.filename);
var secrets = {}
try {
    secrets = require(path.join(appDir, 'config/secrets.json'))    
} catch (error) {
    // Do nothing. Server should handle loading of the configs
}

module.exports = {
    connectIfNeeded: function() {
        if (mongoose.connections > 0) {
            return
        }
        let mongoDB = process.env.MONGODB_BOOKMARK_CONNECTION_STRING || secrets.MONGODB_BOOKMARK_CONNECTION_STRING
        mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
    
        //Get the default connection
        var db = mongoose.connection;
    
        //Bind connection to error event (to get notification of connection errors)
        db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    },
    urlValidator: function(val) {
        urlRegex = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
        return urlRegex.test(val);
    }
}