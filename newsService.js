const env = require("dotenv")
env.config()

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

module.exports.addNews = (newsData) => {
    return new Promise((resolve, reject) => {
        for (const prop in newsData) {
            if (newsData[prop] === ""){
                newsData[prop] = null;
            }
        }
        newsData.newsDate = new Date();
        News.create(newsData).then(() => { resolve()})
        .catch((err) => reject("Unable to create post"));
        });    
}

module.exports.getNewsByMinDate = function(minDateStr){
    return new Promise((resolve, reject) => {
        const { gte } = Sequelize.Op;
        News.findAll({
            where: {
                newsDate: {
                [gte]: new Date(minDateStr)
            }
        }
        }).then((data) => {resolve(data)})
        .catch((err) => reject("No results returned"));
        });       
}

module.exports.getNewsById = (id) => {
    return new Promise((resolve, reject) => {
        News.findAll({
            where: { id: id }
        }).then((data) => {resolve(data[0])})
        .catch((err) => reject("No results returned"));
        });      
}

module.exports.deleteNewsById = (id) => {
    return new Promise((resolve, reject) => {
        News.destroy({
            where: { id: id }
        }).then(() => {resolve()})
        .catch((err) => reject("Error while trying to delete post"));
        });
}
