import React, { useState, useRef, useEffect } from 'react'
import ProgressChart from './ProgressChart'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
const LANGUAGETOOL_API = 'https://api.languagetool.org/v2/check'

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1))
    }
  }
  return dp[a.length][b.length]
}

export default function App() {
  const [name, setName] = useState(localStorage.getItem('ep_name') || '')
  const [started, setStarted] = useState(!!localStorage.getItem('ep_name'))
  const [promptText, setPromptText] = useState('What did you do yesterday?')
  const [transcript, setTranscript] = useState('')
  const [grammarResult, setGrammarResult] = useState(null)
  const [pronScore, setPronScore] = useState(null)
  const [history, setHistory] = useState([])
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (started) loadStats()
  }, [started])

  async function loadStats() {
    try {
      const res = await fetch(`${API_BASE}/stats/${encodeURIComponent(name)}`)
      const data = await res.json()
      setHistory(data.reverse())
    } catch (e) {
      console.error(e)
    }
  }

  function speakPrompt(text) {
    if (!window.speechSynthesis) return alert('No TTS support')
    const ut = new SpeechSynthesisUtterance(text)
    ut.lang = 'en-US'
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(ut)
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return alert('Use Chrome or Edge (Web Speech API)')
    const rec = new SpeechRecognition()
    recognitionRef.current = rec
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      setTranscript(text)
      evaluateGrammar(text)
      evaluatePronunciation(promptText, text)
      saveSession(name, promptText, text)
    }
    rec.onerror = (e) => console.error('rec error', e)
    rec.start()
  }

  function stopListening() {
    if (recognitionRef.current) recognitionRef.current.stop()
  }

  async function evaluateGrammar(text) {
    try {
      const params = new URLSearchParams();
      params.append('text', text)
      params.append('language', 'en-US')
      const resp = await fetch(LANGUAGETOOL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      })
      const data = await resp.json()
      setGrammarResult(data)
    } catch (err) {
      console.error(err)
    }
  }

  function evaluatePronunciation(expected, actual) {
    const a = expected.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
    const b = actual.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
    let matches = 0
    a.forEach((w, i) => { if (b[i] === w) matches++ })
    const lev = levenshtein(a.join(' '), b.join(' '))
    const maxLen = Math.max(a.join(' ').length, b.join(' ').length, 1)
    const wordMatchScore = (matches / Math.max(a.length, 1)) * 60
    const levScore = (1 - lev / maxLen) * 40
    const score = Math.max(0, Math.round(wordMatchScore + levScore))
    setPronScore(score)
    return score
  }

  async function saveSession(userId, prompt, transcript) {
    try {
      const score = pronScore || 0
      await fetch(`${API_BASE}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prompt, transcript, grammarResult, pronScore: score })
      })
      loadStats()
    } catch (e) { console.error(e) }
  }

  if (!started) {
    return (
      <div className="center">
        <h2>Welcome — TalkEasy</h2>
        <input placeholder="Write your name" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={() => { if (!name) return alert('Write your name'); localStorage.setItem('ep_name', name); setStarted(true) }}>Start</button>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Hi, {name}</h1>
      <div className="card">
        <label>Prompt (the app will say this):</label>
        <input value={promptText} onChange={(e) => setPromptText(e.target.value)} />
        <div className="row">
          <button onClick={() => speakPrompt(promptText)}>Speak prompt</button>
          <button onClick={startListening}>Start listening</button>
          <button onClick={stopListening}>Stop</button>
        </div>

        <div className="result">
          <h3>Transcript</h3>
          <div className="box">{transcript || <i>No transcript yet</i>}</div>

          <h3>Pronunciation score</h3>
          <div className="box">{pronScore !== null ? `${pronScore} / 100` : '—'}</div>

          <h3>Grammar suggestions</h3>
          <div className="box">
            {grammarResult === null && <i>No check yet</i>}
            {grammarResult && grammarResult.matches && grammarResult.matches.length === 0 && <div>No errors found.</div>}
            {grammarResult && grammarResult.matches && grammarResult.matches.map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div><b>Message:</b> {m.message}</div>
                <div><b>Suggestion:</b> {(m.replacements||[]).slice(0,3).map(r=>r.value).join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>My Progress</h3>
        <ProgressChart data={history.map((r)=>({createdAt: r.createdAt, pronScore: r.pronScore}))} />
        <h4>Recent sessions</h4>
        <ul>
          {history.slice(0,6).map((s,i)=>(<li key={i}>{new Date(s.createdAt).toLocaleString()} — Score: {s.pronScore}</li>))}
        </ul>
      </div>
    </div>
  )
}
