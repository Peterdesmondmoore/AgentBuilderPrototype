import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AgentBuilder from './AgentBuilder'
import './styles.css'
import './explainer.css'
import './agent-builder.css'

const isAgentBuilder = window.location.hash.startsWith('#/prototypes/agent-builder-self-improvement')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAgentBuilder ? <AgentBuilder /> : <App />}
  </React.StrictMode>,
)
