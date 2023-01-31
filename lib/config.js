require('dotenv').config();

module.exports = {
    db: () => {
        return {
          connection: process.env.MONGO_URL,
          database: process.env.MONGO_DB_NAME
        };
    }
};