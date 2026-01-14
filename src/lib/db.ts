import { Pool } from 'pg'

export const pool = new Pool({
    connectionString: process.env.DATABSE_URL,
})
