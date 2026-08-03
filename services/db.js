// const mongoose = require('mongoose')
// const env = require('../config/env')

// module.exports = function connectDB() {
//   const uri = env.CONNECTION_URL

//   if (!uri) {
//     throw new Error('Missing CONNECTION_URL environment variable')
//   }

//   return mongoose
//     .connect(uri, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     })
//     .then(() => {
//       console.log('MongoDB connected successfully')
//     })
//     .catch((err) => {
//       console.error('MongoDB connection error:', err.message || err)
//       process.exit(1)
//     })
// }
// db.js

// const authors = [
//   { id: 1, name: "Bryan" },
//   { id: 2, name: "Christian" },
//   { id: 3, name: "Jason" },
// ];

// async function getAuthorById(authorId) {
    
//   return authors.find(author => author.id === authorId);
// };

// module.exports = { getAuthorById };
