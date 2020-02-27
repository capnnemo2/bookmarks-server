const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const { makeBookmarksArray } = require("./bookmarks.fixtures");

describe.only("Bookmarks endpoints", function() {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () => db("bookmarks").truncate());

  afterEach("cleanup", () => db("bookmarks").truncate());

  describe("Unauthorized requests", () => {
    it("responds with 401 Unauthorized for GET /bookmarks", () => {
      return supertest(app)
        .get("/bookmarks")
        .expect(401, { error: "Unauthorized request" });
    });

    it("responds with 401 Unauthorized for GET /bookmarks/:bookmark_id", () => {
      return supertest(app)
        .get("/bookmarks/2")
        .expect(401, { error: "Unauthorized request" });
    });
  });

  describe("GET /bookmarks", () => {
    context("Given there are no bookmarks in the database", () => {
      it("respondes with 200 and an empty list", () => {
        return supertest(app)
          .get("/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, []);
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("GET /bookmarks responds with 200 and all of the bookmarks", () => {
        return supertest(app)
          .get("/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks);
      });
    });
  });

  describe("GET /bookmarks/:bookmarks_id", () => {
    context("Given no bookmarks", () => {
      // this works correctly in postman, but test gets error: ECONNREFUSED: Connection refused
      it("responds with 404", () => {
        const bookmarkId = 23456;
        return supertest(app)
          .get(`bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark doesn't exist` } });
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("GET /bookmarks/:bookmark_id responds with 200 and the specified bookmark", () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark);
      });
    });
  });
});
