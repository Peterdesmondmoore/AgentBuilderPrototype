import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AgentBuilder from './AgentBuilder'
import './styles.css'
import './explainer.css'
import './agent-builder.css'
import './agent-network.css'
import './agent-network-visual.css'
import './agent-network-selection.css'
import './agent-network-inspector.css'
import './agent-network-editing.css'
import './agent-network-chat.css'
import './agent-network-execution.css'
import './agent-network-wide.css'

const isAgentBuilder = window.location.hash.startsWith('#/prototypes/agent-builder-self-improvement')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAgentBuilder ? <AgentBuilder /> : <App />}
  </React.StrictMode>,
)
