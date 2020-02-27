const knex = require("knex");
const app = require("./app");
const { PORT, DB_URL } = require("./config");

const db = knex({
  client: "pg",
  conection: DB_URL
});

app.set("db", db);

app.listen(PORT, () => {
  console.log(`Server is listening at http://localhost:${PORT}`);
});
