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
      it("responds with 200 and an empty list", () => {
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

    context("Given an XSS attack bookmark", () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

      beforeEach("insert malicious bookmark", () => {
        return db.into("bookmarks").insert([maliciousBookmark]);
      });

      it("removes XSS attack content", () => {
        return supertest(app)
          .get("/bookmarks")
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

  describe("GET /bookmarks/:bookmarks_id", () => {
    context("Given no bookmarks", () => {
      it("responds with 404", () => {
        const bookmarkId = 23456;
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark doesn't exist` } });
      });
    });

    context("Given an XSS attack bookmark", () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
      beforeEach("insert malicious bookmark", () => {
        return db.into("bookmarks").insert([maliciousBookmark]);
      });

      it("removes XSS attack content", () => {
        return supertest(app)
          .get(`/bookmarks/${maliciousBookmark.id}`)
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

  describe(`POST /bookmarks`, () => {
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
          .post("/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });

    // it("creates a bookmark, responding with 201 and the new bookmark", () => {
    //   const newBookmark = {
    //     title: "Test new bookmark",
    //     url: "https://www.google.com",
    //     description: "Test new bookmark description",
    //     rating: 3
    //   };
    //   return supertest(app)
    //     .post("/bookmarks")
    //     .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
    //     .send(newBookmark)
    //     .expect(201)
    //     .expect(res => {
    //       expect(res.body.title).to.eql(newBookmark.title);
    //       expect(res.body.url).to.eql(newBookmark.url);
    //       expect(res.body.description).to.eql(newBookmark.description);
    //       expect(res.body.rating).to.eql(newBookmark.rating);
    //       expect(res.body).to.have.property("id");
    //       expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`);
    //     })
    //     .then(postRes =>
    //       supertest(app)
    //         .get(`/bookmarks/${postRes.body.id}`)
    //         .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
    //         .expect(postRes.body)
    //     );
    // });
  });
});
