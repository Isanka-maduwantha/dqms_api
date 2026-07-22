const mongoose = require ("mongoose");
const env = require('./env');
 const  connectionDB = async () => {
    try {
        const connectionInstance = await mongoose.connect
        (`${env.CONNECTION_URL}`)
        console.log(`MongoDB Connected ${connectionInstance.connection.host}`)
    } catch (error) {
        if (error instanceof Error) console.error(`Error Connecting to MongoDB: ${error.message} `);
        else console.error("An Unknow Error Occured", error);
    }
}
module.exports = connectionDB;