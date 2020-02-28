const express = require("express");
const uuid = require("uuid/v4");
const logger = require("../logger");
const { bookmarks } = require("../store");
const xss = require("xss");
const BookmarksService = require("../bookmarks-service");

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating)
});

bookmarksRouter
  .route("/bookmarks")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    // the order of keys in newBookmark might be causing problems
    const newBookmark = { title, url, rating };

    for (const [key, value] of Object.entries(newBookmark)) {
      if (value == null) {
        return res
          .status(400)
          .json({ error: { message: `Missing '${key}' in request body` } });
      }
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      logger.error(`Invalid rating '${rating}' supplied`);
      return res.status(400).send({
        error: { message: `'rating' must be a number between 0 and 5` }
      });
    }

    // FOR SOME REASON THIS BLOCK BREAKS THE POST ENDPOINT
    // if (!isWebUri(url)) {
    //   logger.error(`Invalid url '${url}' supplied`);
    //   return res
    //     .status(400)
    //     .send({ error: { message: `'url' must be a valid url` } });
    // }

    BookmarksService.insertArticle(req.app.get("db"), newBookmark)
      .then(bookmark => {
        res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(serializeBookmark(bookmark));
      })
      .catch(next);

    // if (!title) {
    //   logger.error("Title is required");
    //   return res.status(400).send("Invalid data");
    // }

    // if (!url) {
    //   logger.error("Url is required");
    //   return res.status(400).send("Invalid data");
    // }

    // if (!description) {
    //   logger.error("Description is required");
    //   return res.status(400).send("Invalid data");
    // }

    // if (!rating) {
    //   logger.error("Rating is required");
    //   return res.status(400).send("Invalid data");
    // }

    // const id = uuid();
    // const bookmark = {
    //   id,
    //   title,
    //   url,
    //   description,
    //   rating
    // };

    // bookmarks.push(bookmark);

    // logger.info(`Bookmark with id ${id} created`);

    // res.status(201).location(`http://localhost:8000/bookmark/${id}`);
  });

bookmarksRouter
  .route("/bookmarks/:bookmark_id")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    BookmarksService.getById(knexInstance, req.params.bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          return res
            .status(404)
            .json({ error: { message: `Bookmark doesn't exist` } });
        }
        res.json(serializeBookmark(bookmark));
      })
      .catch(next);
  })
  .delete((req, res) => {
    const { id } = req.params;
    const bookmarkIndex = bookmarks.findIndex(b => b.id == id);

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${id} not found`);
      return res.status(404).send("Not Found");
    }

    bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id ${id} deleted`);

    res.status(204).end();
  });

module.exports = bookmarksRouter;
