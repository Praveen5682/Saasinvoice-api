require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"), // only used locally
});

module.exports = {
  development: {
    client: "pg",
    connection: process.env.DEV_DATABASE_URL || {
      host: process.env.DEV_DB_HOST || "127.0.0.1",
      user: process.env.DEV_DB_USER || "postgres",
      password: process.env.DEV_DB_PASSWORD || "",
      database: process.env.DEV_DB_NAME || "postgres",
      port: process.env.DEV_DB_PORT || 5432,
    },
    pool: { min: 2, max: 10 },
    debug: false,
    migrations: {
      directory: "./migrations",
    },
    seeds: {
      directory: "../database/seeds",
    },
  },

  production: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 10 },
    debug: false,
    migrations: {
      directory: "./migrations",
    },
    seeds: {
      directory: "../database/seeds",
    },
  },
};

console.log("DATABASE_URL:", process.env.DATABASE_URL);
