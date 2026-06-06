const path = require('path');
const dotenv = require('dotenv');

// load environment variables from .env file

dotenv.config({path : path.resolve(process.cwd(), '.env')});

console.log(process.env.PORT)