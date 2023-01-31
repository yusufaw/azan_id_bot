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

  return {
    addNewLocation: addNewLocation,
    removeSentence: removeSentence,
    getOneLocationByChatId: getOneLocationByChatId,
    updateLocation: updateLocation,
    getOneSentenceExcept: getOneSentenceExcept,
    getOneSentencByPhrase: getOneSentencByPhrase,
    getSentencesExcept: getSentencesExcept
  }
};

module.exports = LocationsService();
