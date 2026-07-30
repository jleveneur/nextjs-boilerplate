-- Extensions available to every database created from this cluster.
-- uuidv7() is built into PostgreSQL 18; no extension required for primary keys.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
