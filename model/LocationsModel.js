const mongoose = require('../lib/db');

module.exports = mongoose.model('location', {
  chat_id: String,
  latitude: String,
  longitude: Float,
  city: String
});
