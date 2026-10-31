import React, { useState } from 'react';
import { askCopilot } from '../services/api';

export default function CopilotChatPage() {
  const [lang, setLang] = useState('en');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your WattWise Electricity Copilot. Ask me questions about your MSEDCL bill, slab tiers, or savings scenarios in English, Hindi, or Marathi.'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg = { sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await askCopilot(text, lang);
      const aiMsg = { sender: 'ai', text: res.reply, metrics: res.metrics };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Sorry, I encountered an issue processing your query.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Header and Language Selector */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            🤖 Multilingual Bill Explainer Copilot
          </h3>
          <p className="text-muted small mb-0">
            Natural language advice grounded strictly in deterministic MSEDCL tariff arithmetic. No LLM math hallucinations.
          </p>
        </div>

        {/* Language Tabs */}
        <div className="btn-group p-1 bg-white rounded-pill shadow-sm" role="group">
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${lang === 'en' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setLang('en')}
          >
            🇬🇧 English
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${lang === 'hi' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setLang('hi')}
          >
            🇮🇳 हिंदी (Hindi)
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${lang === 'mr' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setLang('mr')}
          >
            🚩 मराठी (Marathi)
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="mb-3 d-flex flex-wrap gap-2">
        <span className="small text-muted align-self-center me-1">Try asking:</span>
        <button
          className="btn btn-outline-secondary btn-sm rounded-pill"
          onClick={() => sendMessage('What if I cut AC by 2 hours and buy a 5-star AC?')}
        >
          💡 "What if I cut AC by 2 hrs and get a 5-star AC?"
        </button>
        <button
          className="btn btn-outline-secondary btn-sm rounded-pill"
          onClick={() => {
            setLang('mr');
            sendMessage('मी एसी ५ स्टार केला तर काय बचत होईल?');
          }}
        >
          🚩 "मी एसी ५ स्टार केला तर काय बचत होईल?"
        </button>
        <button
          className="btn btn-outline-secondary btn-sm rounded-pill"
          onClick={() => {
            setLang('hi');
            sendMessage('100 यूनिट पार करने पर बिल कितना बढ़ेगा?');
          }}
        >
          🇮🇳 "100 यूनिट पार करने पर बिल कितना बढ़ेगा?"
        </button>
        <button
          className="btn btn-outline-secondary btn-sm rounded-pill"
          onClick={() => sendMessage('Explain the MSEDCL slab jump from 100 to 300 units')}
        >
          📊 "Explain MSEDCL slab jump"
        </button>
      </div>

      {/* Chat Container */}
      <div className="card shadow-sm border-0 d-flex flex-column" style={{ height: '520px' }}>
        <div className="card-body p-4 overflow-auto d-flex flex-column gap-3 bg-light rounded-top">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}
            >
              <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
              {msg.metrics && (
                <div className="mt-2 pt-2 border-top small text-muted">
                  <span className="badge bg-success-subtle text-success me-2">Verified Engine Calculation</span>
                  Monthly Savings: ₹{msg.metrics.monthlyRupeesSaved || 0}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble-ai text-muted">
              <span className="spinner-border spinner-border-sm me-2"></span>
              Analyzing tariff rules and formulating verified response...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="card-footer bg-white p-3 border-top">
          <div className="input-group">
            <input
              type="text"
              className="form-control py-2 px-3"
              placeholder={
                lang === 'mr'
                  ? 'वीज बिल किंवा बचतीबद्दल विचारा...'
                  : lang === 'hi'
                  ? 'बिजली बिल या बचत के बारे में पूछें...'
                  : 'Ask about your electricity bill, slab rates, or savings scenario...'
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="btn btn-primary px-4 fw-semibold"
              onClick={() => sendMessage()}
              disabled={loading || !inputMessage.trim()}
            >
              <i className="bi bi-send-fill me-1"></i> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
