const mongoose = require('../lib/db');

module.exports = mongoose.model('location', {
  chat_id: String,
  chat_name: String,
  latitude: Number,
  longitude: Number,
  city: String
});
