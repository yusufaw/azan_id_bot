const config = require('./config');
const mongoose = require('mongoose');
const mongoConfig = config.db();

const connection = mongoConfig.connection + "/"+ mongoConfig.database;
console.log(connection);
mongoose.connect(connection, {useNewUrlParser: true}, function(err) {
    if (err) {
        console.log(err);
    } else {
        console.log('connected to mongodb with database ' + mongoConfig.database);
    }
});
// Query logging is very noisy with the per-minute notification scan; opt in via env.
mongoose.set('debug', process.env.MONGO_DEBUG === 'true');

module.exports = mongoose;