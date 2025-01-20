const mysql = require("mysql2");

//Creating MySQL connection pool
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "fms_db123",
    database: "fms_db",
});

module.exports = pool.promise();
