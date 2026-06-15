import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import type { DemoProfile } from '../../accessProfiles'
import { DEFAULT_USER_ID } from '../../accessProfiles'
import { DEFAULT_CAMPUS_ID, sendAssistantMessage } from '../../api/client'
import { fallbackErpWorkspace } from '../erp/api'
import { fallbackExamWorkspace } from '../exam_lms/api'
import { fallbackLmsWorkspace } from '../lms/api'
import './HubAssistantPage.css'

type RichBlock =
  | { kind: 'text'; content: string }
  | { kind: 'code'; language: string; code: string }
  | { kind: 'table'; title: string; columns: string[]; rows: string[][] }
  | { kind: 'chart'; title: string; values: Array<{ label: string; value: number }> }
  | { kind: 'canvas'; title: string; nodes: Array<{ label: string; detail: string }> }
  | { kind: 'quiz'; title: string; questions: Array<{ prompt: string; options: string[]; answer: string }> }

interface RichAssistantMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  blocks: RichBlock[]
}

interface HubAssistantPageProps {
  activeProfile: DemoProfile
}

interface BrowserSpeechRecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

interface BrowserSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition
}

const BASE_PROMPTS = [
  'What is my next class today?',
  'Show my assignment deadlines this week',
  'Make a mock quiz from my registered courses',
  'When do I have a long break today?',
]

function parseTextAndCode(reply: string): RichBlock[] {
  const blocks: RichBlock[] = []
  const fencePattern = /```(\w+)?\n([\s\S]*?)```/g
  let cursor = 0
  let match = fencePattern.exec(reply)

  while (match) {
    const text = reply.slice(cursor, match.index).trim()
    if (text) blocks.push({ kind: 'text', content: text })
    blocks.push({
      kind: 'code',
      language: match[1] || 'text',
      code: match[2].trim(),
    })
    cursor = match.index + match[0].length
    match = fencePattern.exec(reply)
  }

  const rest = reply.slice(cursor).trim()
  if (rest || blocks.length === 0) {
    blocks.push({ kind: 'text', content: rest || reply })
  }
  return blocks
}

function buildLocalBlocks(prompt: string, reply: string): RichBlock[] {
  const normalized = prompt.toLowerCase()
  const erp = fallbackErpWorkspace(DEFAULT_CAMPUS_ID, DEFAULT_USER_ID)
  const lms = fallbackLmsWorkspace(DEFAULT_CAMPUS_ID, DEFAULT_USER_ID)
  const exam = fallbackExamWorkspace(DEFAULT_CAMPUS_ID, DEFAULT_USER_ID)
  const blocks = parseTextAndCode(reply)

  if (normalized.includes('assignment') || normalized.includes('deadline')) {
    blocks.push({
      kind: 'chart',
      title: 'Upcoming Assignment Load',
      values: lms.assignments.slice(0, 5).map((assignment, index) => ({
        label: assignment.course_code,
        value: index + 1,
      })),
    })
    blocks.push({
      kind: 'table',
      title: 'Assignment Deadlines',
      columns: ['Course', 'Assignment', 'Deadline'],
      rows: lms.assignments.slice(0, 5).map((assignment) => [
        assignment.course_code,
        assignment.title,
        new Intl.DateTimeFormat('en-IN', {
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          month: 'short',
        }).format(new Date(assignment.deadline_at)),
      ]),
    })
  }

  if (normalized.includes('class') || normalized.includes('calendar') || normalized.includes('break') || normalized.includes('free')) {
    blocks.push({
      kind: 'table',
      title: 'Today From Personal Calendar',
      columns: ['Time', 'Item', 'Detail'],
      rows: erp.personal_calendar.items.slice(0, 8).map((item) => [
        `${item.start_label} - ${item.end_label}`,
        item.label,
        item.course_name ?? item.type,
      ]),
    })
  }

  if (normalized.includes('quiz') || normalized.includes('test')) {
    blocks.push({
      kind: 'quiz',
      title: 'Mock Quiz',
      questions: exam.courses.slice(0, 3).map((course, index) => ({
        prompt: `Which concept should you revise first for ${course.course_code}?`,
        options: [
          course.course_name,
          'Mess feedback workflow',
          'Leave approval status',
          'Room maintenance log',
        ],
        answer: course.course_name,
      })).concat({
        prompt: 'What should you check before registering for a new elective?',
        options: ['Timetable overlap', 'Mess rating', 'Guardian phone', 'Hostel room color'],
        answer: 'Timetable overlap',
      }).slice(0, 4),
    })
  }

  if (normalized.includes('plan') || normalized.includes('study') || normalized.includes('canvas')) {
    blocks.push({
      kind: 'canvas',
      title: 'Study Canvas',
      nodes: [
        { label: 'Classes', detail: `${erp.registered_course_ids.length} registered courses` },
        { label: 'Assignments', detail: `${lms.assignments.length} deadlines to track` },
        { label: 'Quizzes', detail: `${exam.quizzes.length} scheduled quiz windows` },
        { label: 'Next action', detail: 'Use free calendar gaps for revision blocks' },
      ],
    })
  }

  if (normalized.includes('code')) {
    blocks.push({
      kind: 'code',
      language: 'tsx',
      code: `function StudyReminder({ course }: { course: string }) {\n  return <strong>{course} revision block</strong>\n}`,
    })
  }

  return blocks
}

function suggestionsFor(prompt: string) {
  const lower = prompt.toLowerCase()
  if (lower.includes('quiz')) {
    return ['Make it harder', 'Show answers only after I choose', 'Make a quiz for another course']
  }
  if (lower.includes('assignment') || lower.includes('deadline')) {
    return ['Plan study blocks around these deadlines', 'Open LMS', 'Which deadline is most urgent?']
  }
  if (lower.includes('class') || lower.includes('calendar') || lower.includes('break')) {
    return ['Find my longest free slot', 'Can I go out for two hours?', 'Show this as an agenda']
  }
  return BASE_PROMPTS
}

function blockKey(messageId: string, index: number) {
  return `${messageId}-block-${index}`
}

function HubAssistantPage({ activeProfile }: HubAssistantPageProps) {
  const [messages, setMessages] = useState<RichAssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ask about your calendar, assignments, quizzes, announcements, food, rooms, or leave.',
      blocks: [{ kind: 'text', content: 'Ask about your calendar, assignments, quizzes, announcements, food, rooms, or leave.' }],
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('Whisper.cpp STT and Piper TTS are the open-source production targets.')
  const [suggestions, setSuggestions] = useState(BASE_PROMPTS)

  const lastAssistantText = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === 'assistant')?.content ?? ''
  }, [messages])

  const sendPrompt = async (prompt: string) => {
    const message = prompt.trim()
    if (!message || isSending) return

    const userMessage: RichAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      blocks: [{ kind: 'text', content: message }],
    }
    setMessages((current) => [...current, userMessage])
    setInput('')
    setIsSending(true)

    const response = await sendAssistantMessage({
      message,
      campusId: DEFAULT_CAMPUS_ID,
      designations: activeProfile.designations,
      role: activeProfile.role,
      userId: DEFAULT_USER_ID,
    })

    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        blocks: buildLocalBlocks(message, response.reply),
      },
    ])
    setSuggestions(suggestionsFor(message))
    setIsSending(false)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sendPrompt(input)
  }

  const startVoiceInput = () => {
    const SpeechRecognition = (window as SpeechRecognitionWindow).SpeechRecognition
      ?? (window as SpeechRecognitionWindow).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceStatus('Voice input needs the Whisper.cpp adapter or a browser with speech recognition enabled.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      if (transcript) setInput((current) => `${current} ${transcript}`.trim())
      setVoiceStatus('Voice input captured.')
    }
    recognition.onerror = () => {
      setVoiceStatus('Voice input stopped before a transcript was captured.')
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)
    recognition.start()
    setIsListening(true)
    setVoiceStatus('Listening...')
  }

  const speakLastReply = () => {
    if (!('speechSynthesis' in window) || !lastAssistantText) {
      setVoiceStatus('TTS needs the Piper adapter or browser speech synthesis support.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(lastAssistantText)
    utterance.lang = 'en-IN'
    window.speechSynthesis.speak(utterance)
    setVoiceStatus('Reading the latest assistant response.')
  }

  return (
    <section className={`hub-assistant-page ${isFocusMode ? 'focus' : ''}`}>
      <header className="hub-assistant-header">
        <div>
          <span>Hub Assistant</span>
          <h1>campuz AI Chat</h1>
        </div>
        <div className="hub-assistant-actions">
          <button onClick={() => setIsFocusMode((current) => !current)} type="button">
            {isFocusMode ? 'Exit Focus' : 'Focus'}
          </button>
          <button onClick={startVoiceInput} type="button">{isListening ? 'Listening' : 'Voice'}</button>
          <button onClick={speakLastReply} type="button">TTS</button>
        </div>
      </header>

      <section className="hub-assistant-workspace">
        <div className="hub-assistant-thread" aria-label="Assistant conversation">
          {messages.map((message) => (
            <article className={`hub-rich-message ${message.role}`} key={message.id}>
              {message.blocks.map((block, index) => (
                <div className={`hub-rich-block ${block.kind}`} key={blockKey(message.id, index)}>
                  {block.kind === 'text' && <p>{block.content}</p>}
                  {block.kind === 'code' && (
                    <>
                      <span>{block.language}</span>
                      <pre><code>{block.code}</code></pre>
                    </>
                  )}
                  {block.kind === 'table' && (
                    <>
                      <strong>{block.title}</strong>
                      <table>
                        <thead>
                          <tr>{block.columns.map((column) => <th key={column}>{column}</th>)}</tr>
                        </thead>
                        <tbody>
                          {block.rows.map((row, rowIndex) => (
                            <tr key={`${block.title}-${rowIndex}`}>
                              {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                  {block.kind === 'chart' && (
                    <>
                      <strong>{block.title}</strong>
                      <div className="hub-mini-chart">
                        {block.values.map((item) => (
                          <div key={item.label}>
                            <span>{item.label}</span>
                            <i style={{ width: `${Math.min(100, item.value * 18)}%` }} />
                            <em>{item.value}</em>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {block.kind === 'canvas' && (
                    <>
                      <strong>{block.title}</strong>
                      <div className="hub-canvas-board">
                        {block.nodes.map((node) => (
                          <article key={node.label}>
                            <span>{node.label}</span>
                            <p>{node.detail}</p>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                  {block.kind === 'quiz' && (
                    <>
                      <strong>{block.title}</strong>
                      <div className="hub-quiz-stack">
                        {block.questions.map((question, questionIndex) => (
                          <details key={question.prompt}>
                            <summary>{questionIndex + 1}. {question.prompt}</summary>
                            <div>
                              {question.options.map((option) => <span key={option}>{option}</span>)}
                            </div>
                            <p>Answer: {question.answer}</p>
                          </details>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </article>
          ))}
          {isSending && <article className="hub-rich-message assistant"><p>Thinking...</p></article>}
        </div>

        <aside className="hub-assistant-side">
          <section>
            <span>Prompt Suggestions</span>
            <div className="hub-prompt-grid">
              {suggestions.map((suggestion) => (
                <button onClick={() => sendPrompt(suggestion)} type="button" key={suggestion}>
                  {suggestion}
                </button>
              ))}
            </div>
          </section>
          <section>
            <span>Voice</span>
            <p>{voiceStatus}</p>
          </section>
        </aside>
      </section>

      <form className="hub-assistant-composer" onSubmit={handleSubmit}>
        <input
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask for a chart, mock quiz, code, calendar, or plan"
          value={input}
        />
        <button disabled={isSending} type="submit">Send</button>
      </form>
    </section>
  )
}

export default HubAssistantPage
