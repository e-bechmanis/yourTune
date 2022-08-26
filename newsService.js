const Sequelize = require('sequelize');
var sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
        ssl: { rejectUnauthorized: false }
    },
    query: { raw: true }
});

// Define a "News" model
var News = sequelize.define('News', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    body: Sequelize.TEXT,
    title: Sequelize.STRING,
    brief: Sequelize.STRING,
    newsDate: Sequelize.DATE,
    featureImage: Sequelize.STRING
});

module.exports.initialize = () => {
    return new Promise((resolve, reject) => {
        sequelize.sync().then(resolve)
        .catch((err) => reject("Unable to sync the database"));
        });        
}

module.exports.getAllNews = () => {
    return new Promise((resolve, reject) => {
        News.findAll().then((data) => {
            resolve(data)})
        .catch((err) => reject("No results returned"));
        });
}

