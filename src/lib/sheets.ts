// lib/sheets.ts
// Google Sheets chat history logger — Service Account auth

import { GoogleAuth } from 'google-auth-library'
import { google, sheets_v4 } from 'googleapis'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ChatSession {
  studentId: string
  studentName: string
  sessionId: string         // unique per chat session (uuid)
  timestamp: string         // ISO string
  messageCount: number
  messages: { role: string; content: string }[]
  imageUploaded: boolean
  weakAreas: string[]
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function getAuth() {
  // Service Account credentials from env
  // Set GOOGLE_SERVICE_ACCOUNT_JSON in .env.local as the full JSON string
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)

  return new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// ── Append a session row ───────────────────────────────────────────────────────
export async function appendChatSession(session: ChatSession): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID!
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID not set in env')

  const auth  = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Flatten messages to readable string
  const messagesStr = session.messages
    .map(m => `[${m.role.toUpperCase()}] ${m.content}`)
    .join(' | ')

  const row = [
    session.timestamp,
    session.studentId,
    session.studentName,
    session.sessionId,
    session.messageCount,
    session.weakAreas.join(', '),
    session.imageUploaded ? 'Yes' : 'No',
    messagesStr,
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'ChatHistory!A:H',   // sheet name: ChatHistory
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  })
}

// ── Ensure header row exists (call once at setup) ──────────────────────────────
export async function ensureSheetHeaders(): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID!
  const auth  = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Check if A1 has data
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'ChatHistory!A1',
  })

  if (check.data.values && check.data.values.length > 0) return

  // Write headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'ChatHistory!A1:H1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        'Timestamp',
        'Student ID',
        'Student Name',
        'Session ID',
        'Message Count',
        'Weak Areas',
        'Image Uploaded',
        'Messages',
      ]],
    },
  })
}

// ── Fetch past sessions for a student (optional — for history display) ─────────
export async function getStudentChatHistory(studentId: string): Promise<any[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID!
  const auth  = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'ChatHistory!A:H',
  })

  const rows = res.data.values || []
  if (rows.length <= 1) return []   // only headers

  // Filter rows matching this student
  return rows.slice(1)
    .filter(row => row[1] === studentId)
    .map(row => ({
      timestamp:    row[0],
      studentId:    row[1],
      studentName:  row[2],
      sessionId:    row[3],
      messageCount: row[4],
      weakAreas:    row[5],
      imageUploaded: row[6],
      messages:     row[7],
    }))
}