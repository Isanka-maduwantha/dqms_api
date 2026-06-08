const path = require('path');
const dotenv = require('dotenv');

// load environment variables from .env file

dotenv.config({path : path.resolve(process.cwd(), '.env')});


module.exports = {
    PORT : process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET
}