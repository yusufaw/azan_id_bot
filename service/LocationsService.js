'use strict';

const LocationsModel = require('../model/LocationsModel');

const LocationsService = () => {
  const addNewLocation = data => {
    return new Promise((resolve, reject) => {
      let dt = new LocationsModel(data);
      dt.save()
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        });
    });
  };

  const removeSentence = data => {
    return new Promise((resolve, reject) => {
      LocationsModel.findOneAndRemove({
        phrase: data.phrase
      })
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        });
    });
  };

  const getOneLocationByChatId = data => {
    return new Promise((resolve, reject) => {
      LocationsModel.findOne(
        { chat_id: data }
      )
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  const updateLocation = data => {
    return new Promise((resolve, reject) => {
      LocationsModel.findOneAndUpdate({
        chat_id: data.chat_id
      }, {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        chat_name: data.chat_name
      }, { upsert: true })
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  const getOneSentenceExcept = (data) => {
    return new Promise((resolve, reject) => {
      LocationsModel.aggregate(
        [{ $sample: { size: 1 } }, { '$match': { "phrase": { $ne: data.phrase } } }]
      )
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  const getSentencesExcept = (data) => {
    return new Promise((resolve, reject) => {
      LocationsModel.aggregate(
        [{ $sample: { size: 3 } }, { '$match': { "phrase": { $ne: data.phrase } } }]
      )
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  const getOneSentencByPhrase = (data) => {
    return new Promise((resolve, reject) => {
      LocationsModel.findOne(
        { phrase: data }
      )
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // Only chats with at least one prayer enabled — bounds the scheduler's working set.
  const getActiveLocations = () => {
    return new Promise((resolve, reject) => {
      LocationsModel.find({
        $or: [
          { 'notifications.subuh': true },
          { 'notifications.dzuhur': true },
          { 'notifications.ashar': true },
          { 'notifications.maghrib': true },
          { 'notifications.isya': true }
        ]
      })
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // Flip a single prayer's notification flag; returns the updated document.
  const toggleNotification = (chatId, prayer) => {
    return new Promise((resolve, reject) => {
      LocationsModel.findOne({ chat_id: chatId })
        .then(location => {
          if (!location) {
            resolve(null);
            return;
          }
          location.notifications[prayer] = !location.notifications[prayer];
          location.save().then(resolve).catch(reject);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // Record that `prayerName` was sent to `chatId` on `date`. Resets the
  // ledger when the date rolls over so it only ever holds today's sends.
  const markNotified = (chatId, date, prayerName) => {
    return new Promise((resolve, reject) => {
      LocationsModel.findOne({ chat_id: chatId })
        .then(location => {
          if (!location) {
            resolve(null);
            return;
          }
          if (location.last_notified_date !== date) {
            location.last_notified_date = date;
            location.notified_today = [prayerName];
          } else if (!location.notified_today.includes(prayerName)) {
            location.notified_today.push(prayerName);
          }
          location.save().then(resolve).catch(reject);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  return {
    addNewLocation: addNewLocation,
    removeSentence: removeSentence,
    getOneLocationByChatId: getOneLocationByChatId,
    updateLocation: updateLocation,
    getOneSentenceExcept: getOneSentenceExcept,
    getOneSentencByPhrase: getOneSentencByPhrase,
    getSentencesExcept: getSentencesExcept,
    getActiveLocations: getActiveLocations,
    toggleNotification: toggleNotification,
    markNotified: markNotified
  }
};

module.exports = LocationsService();
