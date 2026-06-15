import type { FormEvent } from 'react'
import { useState } from 'react'
import { sendAssistantMessage } from '../../api/client'
import type { Designation, Role } from '../../types/campus'
import './AssistantPanel.css'

interface AssistantPanelProps {
  campusId: string
  designations?: Designation[]
  onOpenStandalone?: () => void
  role: Role
  userId: string
}

type AssistantMessage = {
  role: 'assistant' | 'user'
  content: string
}

function AssistantPanel({ campusId, designations = [], onOpenStandalone, role, userId }: AssistantPanelProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content: 'Ask about the menu or what the hub knows today.',
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || isSending) return

    setMessages((current) => [...current, { role: 'user', content: message }])
    setInput('')
    setIsSending(true)

    const response = await sendAssistantMessage({
      message,
      campusId,
      designations,
      userId,
      role,
    })

    setMessages((current) => [
      ...current,
      { role: 'assistant', content: response.reply },
    ])
    setIsSending(false)
  }

  return (
    <section className="assistant-panel" aria-label="Campus assistant">
      <div className="assistant-header">
        <div>
          <span>Assistant</span>
          <h2>CampusBuddy</h2>
        </div>
        <button onClick={onOpenStandalone} type="button">Open</button>
      </div>

      <div className="assistant-messages">
        {messages.map((message, index) => (
          <article className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </article>
        ))}
        {isSending && (
          <article className="assistant-message assistant">Thinking...</article>
        )}
      </div>

      <form className="assistant-form" onSubmit={handleSubmit}>
        <input
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask: What is for lunch?"
          type="text"
          value={input}
        />
        <button disabled={isSending} type="submit">Send</button>
      </form>
    </section>
  )
}

export default AssistantPanel
