import express from 'express'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import cors from 'cors'

const app = express()
app.use(express.json())
app.use(cors())

let db
;(async ()=>{
  db = await open({ filename: './englishApp.db', driver: sqlite3.Database })
  await db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    prompt TEXT,
    transcript TEXT,
    grammarResult TEXT,
    pronScore INTEGER,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)
})()

app.post('/session', async (req, res) => {
  const { userId, prompt, transcript, grammarResult, pronScore } = req.body
  try {
    await db.run('INSERT INTO sessions (userId, prompt, transcript, grammarResult, pronScore) VALUES (?, ?, ?, ?, ?)',
      [userId, prompt, transcript, JSON.stringify(grammarResult), pronScore])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/stats/:userId', async (req, res) => {
  try {
    const rows = await db.all('SELECT pronScore, createdAt FROM sessions WHERE userId = ? ORDER BY createdAt DESC', [req.params.userId])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 4000
app.listen(PORT, ()=> console.log('Server running on', PORT))
