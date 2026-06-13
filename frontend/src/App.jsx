import { useState } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Hi! I am your Campus Copilot. Ask me about the food menu!' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })
      const data = await response.json()
      
      setMessages(prev => [...prev, { role: 'bot', content: data.reply }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Oops! I cannot connect to the server right now.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Campus Copilot</h1>
        <p>Your AI assistant for college life</p>
      </header>
      
      <main className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className="message bot">Thinking...</div>
          )}
        </div>
        
        <form className="chat-input" onSubmit={sendMessage}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What's for lunch today?" 
          />
          <button type="submit" disabled={isLoading}>Send</button>
        </form>
      </main>
    </div>
  )
}

export default App
