import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "neondb_owner",
  password: "npg_91JvlyzieXof",
  host: "ep-holy-surf-anx6yt5a-pooler.c-6.us-east-1.aws.neon.tech",
  database: "neondb",
  port: 5432,
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
});

export default pool;