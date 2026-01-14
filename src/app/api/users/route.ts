import { NextResponse } from "next/server";
import { pool } from "@/lib/db"

export async function GET(){
    const {rows} = await pool.query('SELECT * FROM users')
    return NextResponse.json(rows)
}

export async function POST(req:Request){
    const body = await req.json()
    const {email,name} = body

    if (!email || !name){
        return NextResponse.json(
            {error: 'email and name required'},
            {status: 400}
        )
    }

    const {rows} = await pool.query(
        `INSERT INTO users (email,name)
        VALUES ($1, $2)
        RETURNING *`,
        [email,name]
    )
    return NextResponse.json(rows[0], {status: 201})
}
