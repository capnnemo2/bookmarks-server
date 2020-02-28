function makeBookmarksArray() {
  return [
    {
      id: 1,
      title: "Bing",
      url: "https://www.bing.com",
      description: "",
      rating: 2
    },
    {
      id: 2,
      title: "Yahoo",
      url: "https://www.yahoo.com",
      description: "",
      rating: 1
    },
    {
      id: 3,
      title: "Ask Jeeves",
      url: "https://www.askjeeves.com",
      description: "",
      rating: 2
    },
    {
      id: 4,
      title: "BBC",
      url: "https://www.bbc.com",
      description: "",
      rating: 5
    }
  ];
}

function makeMaliciousBookmark() {
  const maliciousBookmark = {
    id: 911,
    title: 'Naughty naughty very naughty <script>alert("xss");</script>',
    url: "https://www.google.com",
    description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
    rating: 5
  };

  const expectedBookmark = {
    ...maliciousBookmark,
    title:
      'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;',
    description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  };

  return {
    maliciousBookmark,
    expectedBookmark
  };
}

module.exports = {
  makeBookmarksArray,
  makeMaliciousBookmark
};
