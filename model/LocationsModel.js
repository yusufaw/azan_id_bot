const { Schema } = require('mongoose');
const mongoose = require('../lib/db');


const locationSchema = new Schema(
  {
    chat_id: String,
    chat_name: String,
    latitude: Number,
    longitude: Number,
    city: String
  }, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})
module.exports = mongoose.model('location', locationSchema);
