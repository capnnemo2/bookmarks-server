const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const {
  makeBookmarksArray,
  makeMaliciousBookmark
} = require("./bookmarks.fixtures");

describe.only("Bookmarks endpoints", function() {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DATABASE_URL
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () => db("bookmarks").truncate());

  afterEach("cleanup", () => db("bookmarks").truncate());

  describe("Unauthorized requests", () => {
    it("responds with 401 Unauthorized for GET /bookmarks", () => {
      return supertest(app)
        .get("/api/bookmarks")
        .expect(401, { error: "Unauthorized request" });
    });

    it("responds with 401 Unauthorized for GET /bookmarks/:bookmark_id", () => {
      return supertest(app)
        .get("/api/bookmarks/2")
        .expect(401, { error: "Unauthorized request" });
    });
  });

  describe("GET /api/bookmarks", () => {
    context("Given there are no bookmarks in the database", () => {
      it("responds with 200 and an empty list", () => {
        return supertest(app)
          .get("/api/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, []);
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("GET /api/bookmarks responds with 200 and all of the bookmarks", () => {
        return supertest(app)
          .get("/api/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks);
      });
    });

    context("Given an XSS attack bookmark", () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

      beforeEach("insert malicious bookmark", () => {
        return db.into("bookmarks").insert([maliciousBookmark]);
      });

      it("removes XSS attack content", () => {
        return supertest(app)
          .get("/api/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedBookmark.title);
            expect(res.body[0].description).to.eql(
              expectedBookmark.description
            );
          });
      });
    });
  });

  describe("GET /api/bookmarks/:bookmarks_id", () => {
    context("Given no bookmarks", () => {
      it("responds with 404", () => {
        const bookmarkId = 23456;
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark not found` } });
      });
    });

    context("Given an XSS attack bookmark", () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
      beforeEach("insert malicious bookmark", () => {
        return db.into("bookmarks").insert([maliciousBookmark]);
      });

      it("removes XSS attack content", () => {
        return supertest(app)
          .get(`/api/bookmarks/${maliciousBookmark.id}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedBookmark.title);
            expect(res.body.description).to.eql(expectedBookmark.description);
          });
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("GET /api/bookmarks/:bookmark_id responds with 200 and the specified bookmark", () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark);
      });
    });
  });

  describe(`POST /api/bookmarks`, () => {
    const requiredFields = ["title", "url", "rating"];
    requiredFields.forEach(field => {
      const newBookmark = {
        title: "Test new bookmark",
        url: "https://www.google.com",
        rating: 4
      };
      it(`responds with 400 and an error message when the ${field} is missing`, () => {
        delete newBookmark[field];
        return supertest(app)
          .post("/api/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send(newBookmark)
          .expect(400, {
            error: { message: `'${field}' is required` }
          });
      });
    });

    it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
      const newBookmarkInvalidRating = {
        title: "Test title",
        url: "https://www.test.com",
        rating: "invalid"
      };
      return supertest(app)
        .post("/api/bookmarks")
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmarkInvalidRating)
        .expect(400, {
          error: { message: `'rating' must be a number between 0 and 5` }
        });
    });

    it(`responds with 400 invalid 'url' if not a valid url`, () => {
      const newBookmarkInvalidUrl = {
        title: "Test title",
        url: "htp:/invalid-url.cm",
        rating: 1
      };

      return supertest(app)
        .post("/api/bookmarks")
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmarkInvalidUrl)
        .expect(400, { error: { message: `'url' must be a valid url` } });
    });

    it("creates a bookmark, responding with 201 and the new bookmark", () => {
      const newBookmark = {
        title: "Test new bookmark",
        url: "https://www.google.com",
        description: "",
        rating: 3
      };
      return supertest(app)
        .post("/api/bookmarks")
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.url).to.eql(newBookmark.url);
          expect(res.body.description).to.eql(newBookmark.description);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body).to.have.property("id");
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`);
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/bookmarks/${postRes.body.id}`)
            .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
            .expect(postRes.body)
        );
    });

    it("removes XSS attack content from response", () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
      return supertest(app)
        .post("/api/bookmarks")
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .send(maliciousBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title);
          expect(res.body.description).to.eql(expectedBookmark.description);
        });
    });
  });

  describe(`DELETE /api/bookmarks/:bookmark_id`, () => {
    context("given there are no bookmarks in the database", () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456;
        return supertest(app)
          .delete(`/api/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark not found` } });
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("responds with 204 and removes the bookmark", () => {
        const idToRemove = 2;
        const expectedBookmarks = testBookmarks.filter(
          bookmark => bookmark.id !== idToRemove
        );

        return supertest(app)
          .delete(`/api/bookmarks/${idToRemove}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(() => {
            supertest(app)
              .get(`/api/bookmarks`)
              .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks);
          });
      });
    });
  });

  describe.only(`PATCH /api/bookmarks/:bookmark_id`, () => {
    context("Given no bookmarks", () => {
      it("responds with 404", () => {
        const bookmarkId = 123456;
        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark not found` } });
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert articles", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("responds with 204 and updates the bookmark", () => {
        const idToUpdate = 2;
        const updateBookmark = {
          title: "updated bookmark title",
          url: "http://www.updated.com",
          rating: 4
        };
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        };
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send(updateBookmark)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmark)
          );
      });

      it("responds with 400 when no required fields supplied", () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send({ irrelevantField: "bummer" })
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'url', or 'rating'`
            }
          });
      });

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2;
        const updateBookmark = {
          title: "update bookmark title"
        };
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        };

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send({
            ...updateBookmark,
            fieldToIgnore: "should not be in GET response"
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmark)
          );
      });
    });
  });
});
