const uuid = require("uuid");

const bookmarks = [
  {
    id: uuid(),
    title: "Google",
    url: "https://www.google.com",
    description: "Search for anything",
    rating: 5
  },
  {
    id: uuid(),
    title: "Amazon",
    url: "https://www.amazon.com",
    description: "Buy for anything",
    rating: 5
  },
  {
    id: uuid(),
    title: "Apple",
    url: "https://www.apple.com",
    description: "Get expensive toys",
    rating: 5
  }
];

module.exports = { bookmarks };
