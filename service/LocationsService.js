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

  const getOneSentence = () => {
    return new Promise((resolve, reject) => {
      LocationsModel.aggregate(
        [{ $sample: { size: 1 } }]
      )
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  const addBulkSentences = data => {
    return new Promise((resolve, reject) => {
      LocationsModel.insertMany(data)
        .then(result => {
          resolve(result);
        })
        .catch(err => {
          reject(err);
        });
    });
  };

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
    addNewSentence: addNewSentence,
    removeSentence: removeSentence,
    getOneSentence: getOneSentence,
    addBulkSentences: addBulkSentences,
    getOneSentenceExcept: getOneSentenceExcept,
    getOneSentencByPhrase: getOneSentencByPhrase,
    getSentencesExcept: getSentencesExcept
  }
};

module.exports = SentencesService();
