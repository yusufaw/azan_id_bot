const { Schema } = require('mongoose');
const mongoose = require('../lib/db');


const locationSchema = new Schema(
  {
    chat_id: String,
    chat_name: String,
    latitude: Number,
    longitude: Number,
    city: String,
    // Per-prayer opt-in for azan notifications. All off by default.
    notifications: {
      subuh: { type: Boolean, default: false },
      dzuhur: { type: Boolean, default: false },
      ashar: { type: Boolean, default: false },
      maghrib: { type: Boolean, default: false },
      isya: { type: Boolean, default: false }
    },
    // Dedup ledger for the notification scheduler (persisted so restarts never resend).
    last_notified_date: { type: String, default: '' }, // "yyyy-M-D" in the chat's timezone
    notified_today: { type: [String], default: [] }     // prayer names already sent today
  }, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})
module.exports = mongoose.model('location', locationSchema);
