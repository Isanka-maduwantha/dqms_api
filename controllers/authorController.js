// controllers/authorController.js

const db = require("../services/db");

async function getAuthorById(req, res) {
  const { authorId } = req.params;
    try{
  const author = await db.getAuthorById(Number(authorId));

  if (!author) {
    res.status(404).send("Author not found");
    return;
  }

  res.send(`Author Name: ${author.name}`);}
  catch (err){
    console.error("Error retriving author",err)
    res.status(500).send("internal Server Error");
  }
};

module.exports = { getAuthorById };
