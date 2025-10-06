import React from 'react'
import { LineChart, Line, Tooltip, CartesianGrid, XAxis, YAxis } from 'recharts'

export default function ProgressChart({ data }) {
  if (!data || data.length === 0) return <div>No data yet</div>
  return (
    <LineChart width={350} height={200} data={data}>
      <XAxis dataKey="createdAt" hide />
      <YAxis domain={[0,100]} />
      <Tooltip />
      <CartesianGrid strokeDasharray="3 3" />
      <Line type="monotone" dataKey="pronScore" />
    </LineChart>
  )
}
