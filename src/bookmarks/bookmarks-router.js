const express = require("express");
const uuid = require("uuid/v4");
const logger = require("../logger");
const { bookmarks } = require("../store");

const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
  .route("/bookmarks")
  .get((req, res) => {
    res.json(bookmarks);
  })
  .post(bodyParser, (req, res) => {
    // here
  });

bookmarksRouter
  .route("/bookmarks/:id")
  .get((req, res) => {
    // here
  })
  .delete((req, res) => {
    // here
  });

module.exports = bookmarksRouter;
