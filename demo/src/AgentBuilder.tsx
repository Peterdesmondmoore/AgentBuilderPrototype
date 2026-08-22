import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type Page = 'Home' | 'Login' | 'Agent Network' | 'Overview' | 'Builder' | 'Agent Testers' | 'Feedback'
type RunState = 'idle' | 'issues' | 'passed'
type NetworkNode = { id: string; type: string; label: string; detail: string; x: number; y: number; selected?: boolean }
type AgentDraft = { qaDescription: string; targetModel: string; timeHorizon: string; reasoningLevel: string; dataObjects: string[]; routingTargets: string[] }
type AgentFixtureNetwork = { id: string; name: string; summary: string; state: string; nodes: NetworkNode[]; edges: Array<[string, string]>; draft: AgentDraft }
type ChatMessage = { speaker: 'user' | 'assistant'; text: string }
type ChatFeedbackEvidence = { transcript: ChatMessage[]; timestamp: string; agent: string; route: string; capability: string | null; dataObjects: string[]; model: string | null; executionPath: string[] }
type AgentTesterFeedbackEvidence = { persona: string; transcript: string[][]; finding: string; route: string; dataObjects: string[]; horizon: string }
type FeedbackCaptureState = 'idle' | 'prompt' | 'form'
type FeedbackStatus = 'New' | 'Evaluated' | 'Draft Applied'
type NetworkLayer = 'All' | 'Experience' | 'Routing & Capabilities' | 'Context & Knowledge' | 'Models' | 'Feedback & Improvement'
type FeedbackRecord = { id: string; sourceType: 'user' | 'agent-tester'; createdTime: string; agent: string; content: string; relatedInteraction: string; affectedCapability: string | null; evidence: ChatFeedbackEvidence | AgentTesterFeedbackEvidence; status: FeedbackStatus }

const feedbackRelatesToNode = (record: FeedbackRecord, node: NetworkNode) => record.affectedCapability === node.label || record.evidence.route === node.label

const bridgeVersion = 2
const prototypeKey = 'agent-builder-self-improvement'

const personas = [
  { name: 'Delivery Manager', role: 'Delivery coordination', summary: 'Concise, evidence-led delivery decisions and escalation.', state: 'Active' },
  { name: 'Executive Sponsor', role: 'Strategic oversight', summary: 'Strategic information without operational detail.', state: 'Active' },
  { name: 'Product Manager', role: 'Product planning', summary: 'Demand, release and dependency visibility.', state: 'Active' },
  { name: 'New Mission Owner', role: 'New to Mission Surface', summary: 'Learns terminology while pursuing a business outcome.', state: 'Draft' },
]

const networkNodes: NetworkNode[] = [
  { id: 'chat', type: 'Chat', label: 'Mission Chat', detail: 'User conversation', x: 90, y: 230 },
  { id: 'router', type: 'Router', label: 'Intent Router', detail: '93% confidence', x: 270, y: 230 },
  { id: 'agent', type: 'Agent', label: 'Agent Builder', detail: 'Selected agent', x: 455, y: 230, selected: true },
  { id: 'qa', type: 'Q&A capability', label: 'RAID Analysis', detail: 'Delivery risk assessment', x: 650, y: 120 },
  { id: 'form', type: 'Form / workflow', label: 'Escalation Intake', detail: 'Guided workflow', x: 650, y: 350 },
  { id: 'mission', type: 'Data Object', label: 'Mission', detail: 'Structured context', x: 850, y: 65 },
  { id: 'raid', type: 'Data Object', label: 'RAID Items', detail: 'Structured context', x: 850, y: 185 },
  { id: 'knowledge', type: 'Knowledge source', label: 'Delivery Playbook', detail: 'Reference guidance', x: 850, y: 305 },
  { id: 'model', type: 'Model', label: 'gpt-5', detail: 'Response reasoning', x: 455, y: 430 },
  { id: 'response', type: 'Response', label: 'Delivery response', detail: 'Chat output', x: 650, y: 470 },
]

const networkEdges: Array<[string, string]> = [
  ['chat', 'router'], ['router', 'agent'], ['agent', 'qa'], ['agent', 'form'], ['qa', 'mission'], ['qa', 'raid'], ['qa', 'knowledge'], ['qa', 'model'], ['form', 'model'], ['model', 'response'], ['response', 'chat'],
]

const fixtureAgentNetworks: AgentFixtureNetwork[] = [
  { id: 'agent-builder', name: 'Agent Builder', summary: 'Delivery intelligence assistant', state: 'Active', nodes: networkNodes, edges: networkEdges, draft: { qaDescription: 'Determine material delivery concerns requiring management attention.', targetModel: 'gpt-5', timeHorizon: 'Current reporting period', reasoningLevel: 'Medium', dataObjects: ['mission', 'raid'], routingTargets: ['qa', 'form'] } },
  {
    id: 'portfolio-navigator', name: 'Portfolio Navigator', summary: 'Portfolio health and decision support', state: 'Draft',
    nodes: [
      { id: 'chat', type: 'Chat', label: 'Portfolio Chat', detail: 'Executive conversation', x: 90, y: 230 },
      { id: 'router', type: 'Router', label: 'Portfolio Router', detail: '91% confidence', x: 270, y: 230 },
      { id: 'agent', type: 'Agent', label: 'Portfolio Navigator', detail: 'Selected agent', x: 455, y: 230, selected: true },
      { id: 'qa', type: 'Q&A capability', label: 'Portfolio Health', detail: 'Strategic health view', x: 650, y: 120 },
      { id: 'form', type: 'Form / workflow', label: 'Decision Brief', detail: 'Executive workflow', x: 650, y: 350 },
      { id: 'mission', type: 'Data Object', label: 'Portfolio', detail: 'Structured context', x: 850, y: 65 },
      { id: 'raid', type: 'Data Object', label: 'Outcomes', detail: 'Structured context', x: 850, y: 185 },
      { id: 'knowledge', type: 'Knowledge source', label: 'Investment Framework', detail: 'Reference guidance', x: 850, y: 305 },
      { id: 'model', type: 'Model', label: 'gpt-5', detail: 'Response reasoning', x: 455, y: 430 },
      { id: 'response', type: 'Response', label: 'Portfolio response', detail: 'Chat output', x: 650, y: 470 },
    ],
    edges: networkEdges,
    draft: { qaDescription: 'Explain portfolio health, decision points and strategic dependencies.', targetModel: 'gpt-5', timeHorizon: 'Current quarter', reasoningLevel: 'Medium', dataObjects: ['mission', 'raid'], routingTargets: ['qa', 'form'] },
  },
]

const initialChatThreads: Record<string, ChatMessage[]> = {
  'agent-builder': [{ speaker: 'assistant', text: 'I can help you understand delivery health, RAID items and escalation concerns.' }],
  'portfolio-navigator': [{ speaker: 'assistant', text: 'I can help you explore portfolio health, outcomes and executive decision points.' }],
}

const fixtureChatResponse = (agentName: string, message: string) => {
  const question = message.toLowerCase()
  if (agentName === 'Portfolio Navigator') {
    if (question.includes('risk') || question.includes('health')) return 'The fixture portfolio is broadly on track, with two outcomes needing an executive decision on sequencing this quarter.'
    return 'For this fixture portfolio, I would summarise the health, material dependencies and the next decision owner for the executive audience.'
  }
  if (question.includes('risk') || question.includes('worried') || question.includes('delivery')) return 'The fixture response identifies the payments-integration dependency as the material delivery concern and recommends confirming an accountable decision owner.'
  return 'For this fixture Mission, I can summarise current delivery health, RAID items and the next action requiring management attention.'
}

const fixtureExecutionPath = (agent: AgentFixtureNetwork, message: string) => {
  const prefersWorkflow = /escalat|decision brief|submit|form|intake/.test(message.toLowerCase())
  const capability = prefersWorkflow && agent.draft.routingTargets.includes('form') ? 'form' : agent.draft.routingTargets.includes('qa') ? 'qa' : agent.draft.routingTargets.includes('form') ? 'form' : null
  return ['chat', 'router', 'agent', ...(capability ? [capability] : []), ...(capability === 'qa' ? agent.draft.dataObjects : []), 'model', 'response']
}

const executionRole = (node: NetworkNode, path: string[]) => {
  if (!path.includes(node.id)) return null
  if (node.type === 'Chat') return 'User message received'
  if (node.type === 'Router') return 'Intent classified and route selected'
  if (node.type === 'Agent') return 'Selected agent coordinated the route'
  if (node.type === 'Q&A capability' || node.type === 'Form / workflow') return 'Capability executed'
  if (node.type === 'Data Object' || node.type === 'Knowledge source') return 'Fixture context accessed'
  if (node.type === 'Model') return 'Response reasoning applied'
  if (node.type === 'Response') return 'Fixture response returned to Chat'
  return 'Participated in the fixture execution'
}

const captureChatEvidence = (agent: AgentFixtureNetwork, messages: ChatMessage[], path: string[]): ChatFeedbackEvidence => {
  const pathNodes = path.map((id) => agent.nodes.find((node) => node.id === id)).filter((node): node is NetworkNode => Boolean(node))
  const capability = pathNodes.find((node) => node.type === 'Q&A capability' || node.type === 'Form / workflow')
  return {
    transcript: messages,
    timestamp: new Date().toISOString(),
    agent: agent.name,
    route: pathNodes.find((node) => node.type === 'Router')?.label ?? 'No route recorded',
    capability: capability?.label ?? null,
    dataObjects: pathNodes.filter((node) => node.type === 'Data Object').map((node) => node.label),
    model: pathNodes.find((node) => node.type === 'Model')?.label ?? null,
    executionPath: pathNodes.map((node) => node.label),
  }
}

const transcriptWithIssue = [
  ['Tester — Delivery Manager', 'Is there anything I need to be worried about on the Digital Investment Platform Mission?'],
  ['Assistant', 'There are three current RAID items. The payments-integration dependency is amber and could affect the September release if the vendor decision slips.'],
  ['Tester — Delivery Manager', 'Which one actually threatens delivery?'],
  ['Assistant', 'The payments-integration dependency is the material delivery risk. It affects the release path and needs an owner decision this week.'],
  ['Tester — Delivery Manager', 'What about the release dependency that was discussed earlier this week?'],
  ['Assistant', 'I can see the structured RAID items, but I have not included earlier conversation context in this assessment.'],
]

const transcriptPassed = [
  ['Tester — Delivery Manager', 'Is there anything I need to be worried about on the Digital Investment Platform Mission?'],
  ['Assistant', 'Yes. The payments-integration dependency is amber and, together with the release concern discussed earlier this week, threatens the September release unless the vendor decision is made by Friday.'],
  ['Tester — Delivery Manager', 'Which one actually threatens delivery?'],
  ['Assistant', 'The payments-integration dependency is the material risk. Chat History shows the release dependency has no confirmed contingency, so this requires management attention today.'],
  ['Tester — Delivery Manager', 'What about the release dependency that was discussed earlier this week?'],
  ['Assistant', 'That concern is directly relevant: it makes the vendor dependency an escalation, not simply an amber watch item. I recommend confirming an accountable decision owner and contingency by Friday.'],
]

export default function AgentBuilder() {
  const [page, setPage] = useState<Page>('Home')
  const [authenticated, setAuthenticated] = useState(false)
  const [personaOpen, setPersonaOpen] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState('Delivery Manager')
  const [runState, setRunState] = useState<RunState>('idle')
  const [testPackRun, setTestPackRun] = useState(false)
  const [feedbackRecords, setFeedbackRecords] = useState<FeedbackRecord[]>([])
  const [chatHistoryAdded, setChatHistoryAdded] = useState(false)
  const [builderFinding, setBuilderFinding] = useState(false)

  const bridge = useMemo(() => {
    const query = new URLSearchParams(window.location.search)
    if (query.get('msProtocol') !== 'mission-surface-prototype' || query.get('msVersion') !== String(bridgeVersion) || query.get('msPrototype') !== prototypeKey || !query.get('msChannel') || !query.get('msParentOrigin')) return null
    const parentOrigin = new URL(query.get('msParentOrigin') as string).origin
    if (parentOrigin !== 'https://missionsurface.com' && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(parentOrigin)) return null
    return { channel: query.get('msChannel'), parentOrigin }
  }, [])

  useEffect(() => {
    if (!bridge) return
    const message = { protocol: 'mission-surface-prototype', version: bridgeVersion, channel: bridge.channel, prototypeKey, type: 'ready', page }
    window.parent.postMessage(message, bridge.parentOrigin)
    const timers = [250, 1000].map((delay) => window.setTimeout(() => window.parent.postMessage(message, bridge.parentOrigin), delay))
    return () => timers.forEach(window.clearTimeout)
  }, [bridge])

  useEffect(() => {
    if (bridge) window.parent.postMessage({ protocol: 'mission-surface-prototype', version: bridgeVersion, channel: bridge.channel, prototypeKey, type: 'page', page }, bridge.parentOrigin)
  }, [bridge, page])

  const openBuilder = () => { setBuilderFinding(true); setPage('Builder') }
  const login = () => { setAuthenticated(true); setPage('Agent Network') }
  const exitWorkspace = () => { setAuthenticated(false); setPage('Home') }
  const runTest = () => setRunState(chatHistoryAdded ? 'passed' : 'issues')
  const createFeedback = () => {
    setFeedbackRecords((current) => current.some((record) => record.sourceType === 'agent-tester') ? current : [...current, { id: `feedback-${current.length + 1}`, sourceType: 'agent-tester', createdTime: '2026-08-22T09:30:00.000Z', agent: 'Agent Builder', content: 'RAID Analysis does not consider recent conversation context.', relatedInteraction: 'Delivery Manager test: Management attention check', affectedCapability: 'RAID Analysis', evidence: { persona: 'Delivery Manager', transcript: transcriptWithIssue, finding: 'RAID Analysis does not consider recent conversation context.', route: 'RAID Analysis', dataObjects: ['Mission', 'RAID Items'], horizon: 'Current reporting period' }, status: 'New' }])
    setPage('Feedback')
  }
  const createUserFeedback = (evidence: ChatFeedbackEvidence, content: string) => setFeedbackRecords((current) => [...current, { id: `feedback-${current.length + 1}`, sourceType: 'user', createdTime: evidence.timestamp, agent: evidence.agent, content, relatedInteraction: `Chat interaction at ${new Date(evidence.timestamp).toLocaleString()}`, affectedCapability: evidence.capability, evidence, status: 'New' }])
  const evaluateFeedback = (recordId: string) => setFeedbackRecords((current) => current.map((record) => record.id === recordId && record.status === 'New' ? { ...record, status: 'Evaluated' } : record))
  const applyDraft = (recordId: string) => { setChatHistoryAdded(true); setFeedbackRecords((current) => current.map((record) => record.id === recordId && record.status === 'Evaluated' ? { ...record, status: 'Draft Applied' } : record)) }
  const transcript = runState === 'passed' ? transcriptPassed : transcriptWithIssue

  return <div className="ab-app">
    <header className="ab-topbar">
      <button className="ab-brand" onClick={() => setPage(authenticated ? 'Agent Network' : 'Home')} aria-label="Agent Builder home"><span>AB</span><div><strong>Agent Builder</strong><small>{authenticated ? 'Agent Network' : 'Visual AI agent design'}</small></div></button>
      <nav aria-label="Agent Builder primary navigation">
        {!authenticated ? <><button className={page === 'Home' ? 'active' : ''} onClick={() => setPage('Home')}>Home</button><button className={page === 'Login' ? 'active' : ''} onClick={() => setPage('Login')}>Log in</button></> : <button className={page === 'Agent Network' ? 'active' : ''} onClick={() => setPage('Agent Network')}>Agent Network</button>}
      </nav>
      {authenticated ? <div className="ab-status"><span className="fixture-dot" /> Fixture workspace <button onClick={exitWorkspace} aria-label="Exit fixture workspace">PD</button></div> : <button className="home-login-link" onClick={() => setPage('Login')}>Log in <span>→</span></button>}
    </header>

    <main className="ab-main">
      {page === 'Home' && <HomeScreen goTo={setPage} />}
      {page === 'Login' && <LoginScreen onLogin={login} />}
      {page === 'Agent Network' && <AgentNetworkScreen goTo={setPage} chatHistoryAdded={chatHistoryAdded} onUserFeedback={createUserFeedback} onApplyFeedbackDraft={applyDraft} userFeedbackCount={feedbackRecords.filter((record) => record.sourceType === 'user').length} feedbackRecords={feedbackRecords} />}
      {page === 'Overview' && <Overview goTo={setPage} />}
      {page === 'Builder' && <Builder chatHistoryAdded={chatHistoryAdded} finding={builderFinding} goTesters={() => setPage('Agent Testers')} />}
      {page === 'Agent Testers' && <Testers
        selectedPersona={selectedPersona} setSelectedPersona={setSelectedPersona} personaOpen={personaOpen} setPersonaOpen={setPersonaOpen}
        runState={runState} runTest={runTest} testPackRun={testPackRun} setTestPackRun={setTestPackRun}
        transcript={transcript} feedbackCreated={feedbackRecords.some((record) => record.sourceType === 'agent-tester')} createFeedback={createFeedback} openBuilder={openBuilder} chatHistoryAdded={chatHistoryAdded} openHistory={setRunState}
      />}
      {page === 'Feedback' && <Feedback feedbackRecords={feedbackRecords} chatHistoryAdded={chatHistoryAdded} evaluate={evaluateFeedback} applyDraft={applyDraft} retest={() => { setPage('Agent Testers'); setRunState('passed') }} openBuilder={openBuilder} />}
    </main>
    <footer className="ab-disclosure">Simulated experience · Fixture-only data · Tester behavior is deterministic · No model calls or configuration changes occur outside this local prototype.</footer>
  </div>
}

function Home({ goTo }: { goTo: (page: Page) => void }) {
  return <section className="ab-home">
    <div className="home-orbit" aria-hidden="true"><span>AI</span><i /><i /><i /></div>
    <div className="home-copy"><span className="ab-kicker">AGENT BUILDER</span><h1>Make AI agents easier to see, shape and test.</h1><p>Agent Builder provides a visual way to configure, understand and test AI agents before they reach the people who rely on them.</p><button className="ab-primary" onClick={() => goTo('Login')}>Log in <span>→</span></button><small>Prototype environment · fixture data only</small></div>
  </section>
}

function Login({ onLogin }: { onLogin: () => void }) {
  return <section className="ab-login-page"><form className="login-card" onSubmit={(event) => { event.preventDefault(); onLogin() }}><span className="ab-kicker">FIXTURE ACCESS</span><h1>Log in to Agent Builder</h1><p>Enter any fixture credentials to open the Agent Network workspace.</p><label>Email or username<input name="username" type="text" autoComplete="username" placeholder="name@example.com" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required /></label><button className="ab-primary" type="submit">Log in <span>→</span></button><small>Authentication is simulated. No credentials are sent, stored or verified.</small></form></section>
}

function ScreenGuide({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return <aside className="screen-guide" role="dialog" aria-label={`${title} guide`}><span className="ab-kicker">QUICK GUIDE</span><h2>{title}</h2><div>{children}</div><button type="button" onClick={() => setOpen(false)}>Got it</button></aside>
}

function HomeScreen({ goTo }: { goTo: (page: Page) => void }) { return <><Home goTo={goTo} /><ScreenGuide title="Welcome to Agent Builder"><p>Agent Builder gives you a visual way to understand, configure and test fixture AI agents.</p><p>Use Log in to enter the Agent Network workspace.</p></ScreenGuide></> }
function LoginScreen({ onLogin }: { onLogin: () => void }) { return <><Login onLogin={onLogin} /><ScreenGuide title="Fixture login"><p>Enter any email or password to open the simulated workspace. No credentials are stored or verified.</p></ScreenGuide></> }
function AgentNetworkScreen(props: { goTo: (page: Page) => void; chatHistoryAdded: boolean; onUserFeedback: (evidence: ChatFeedbackEvidence, content: string) => void; onApplyFeedbackDraft: (recordId: string) => void; userFeedbackCount: number; feedbackRecords: FeedbackRecord[] }) { return <><AgentNetwork {...props} /><ScreenGuide title="Explore the Agent Network"><ol><li>Select an agent to redraw its fixture network.</li><li>Select nodes to inspect configuration and update Draft settings.</li><li>Use Chat with Agent while keeping the network visible.</li><li>Send a message to observe the execution path across nodes and relationships.</li></ol></ScreenGuide></> }

function AgentNetwork({ goTo, chatHistoryAdded, onUserFeedback, onApplyFeedbackDraft, userFeedbackCount, feedbackRecords }: { goTo: (page: Page) => void; chatHistoryAdded: boolean; onUserFeedback: (evidence: ChatFeedbackEvidence, content: string) => void; onApplyFeedbackDraft: (recordId: string) => void; userFeedbackCount: number; feedbackRecords: FeedbackRecord[] }) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const [agentNetworks, setAgentNetworks] = useState<AgentFixtureNetwork[]>(fixtureAgentNetworks)
  const [chatThreads, setChatThreads] = useState<Record<string, ChatMessage[]>>(initialChatThreads)
  const [chatInput, setChatInput] = useState('')
  const [executionPath, setExecutionPath] = useState<string[]>([])
  const [lastExecutionPath, setLastExecutionPath] = useState<string[]>([])
  const [feedbackCapture, setFeedbackCapture] = useState<FeedbackCaptureState>('idle')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackEvidence, setFeedbackEvidence] = useState<ChatFeedbackEvidence | null>(null)
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null)
  const [activeLayer, setActiveLayer] = useState<NetworkLayer>('All')
  const [agentFilter, setAgentFilter] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState('agent-builder')
  const [selectedNodeId, setSelectedNodeId] = useState('agent')
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const selectedAgent = agentNetworks.find((agent) => agent.id === selectedAgentId) ?? agentNetworks[0]
  const visibleAgents = agentNetworks.filter((agent) => agent.name.toLowerCase().includes(agentFilter.trim().toLowerCase()))
  const nodeById = new Map(selectedAgent.nodes.map((node) => [node.id, node]))
  const selectedNode = nodeById.get(selectedNodeId) ?? nodeById.get('agent')!
  const chatMessages = chatThreads[selectedAgent.id] ?? []
  const agentFeedback = feedbackRecords.filter((record) => record.agent === selectedAgent.name)
  const feedbackForNode = agentFeedback.filter((record) => feedbackRelatesToNode(record, selectedNode))
  const selectedFeedback = feedbackForNode.find((record) => record.id === selectedFeedbackId) ?? null
  const unresolvedFeedbackCount = (node: NetworkNode) => agentFeedback.filter((record) => record.status !== 'Draft Applied' && feedbackRelatesToNode(record, node)).length
  const evaluatedFeedback = agentFeedback.filter((record) => record.status === 'Evaluated')
  const draftRecommendation = evaluatedFeedback.find((record) => record.sourceType === 'agent-tester' && record.affectedCapability === 'RAID Analysis') ?? null
  const relatedNodeIds = new Set(selectedAgent.edges.filter(([sourceId, targetId]) => sourceId === selectedNode.id || targetId === selectedNode.id).flatMap(([sourceId, targetId]) => [sourceId, targetId]))
  const relationships = [...relatedNodeIds].filter((id) => id !== selectedNode.id).map((id) => nodeById.get(id)!.label)
  const changeZoom = (amount: number) => setView((current) => ({ ...current, scale: Math.min(1.7, Math.max(0.55, Number((current.scale + amount).toFixed(2)))) }))
  const fitNetwork = () => setView({ scale: 0.78, x: 105, y: 26 })
  const resetView = () => setView({ scale: 1, x: 0, y: 0 })
  const selectAgent = (agentId: string) => { setSelectedAgentId(agentId); setSelectedNodeId('agent'); setSelectedFeedbackId(null); setChatInput(''); setExecutionPath([]); setLastExecutionPath([]); setFeedbackCapture('idle'); setFeedbackText(''); setFeedbackEvidence(null); resetView() }
  const updateDraft = (changes: Partial<AgentDraft>) => setAgentNetworks((current) => current.map((agent) => {
    if (agent.id !== selectedAgent.id) return agent
    const draft = { ...agent.draft, ...changes }
    let nodes = agent.nodes.map((node) => node.id === 'qa' ? { ...node, detail: draft.qaDescription } : node.id === 'model' ? { ...node, label: draft.targetModel, detail: `${draft.reasoningLevel} reasoning` } : node)
    const hasChatHistory = draft.dataObjects.includes('chat-history')
    if (hasChatHistory && !nodes.some((node) => node.id === 'chat-history')) nodes = [...nodes, { id: 'chat-history', type: 'Data Object', label: 'Chat History', detail: `Recent conversation · ${draft.timeHorizon}`, x: 850, y: 425 }]
    if (!hasChatHistory) nodes = nodes.filter((node) => node.id !== 'chat-history')
    const retainedEdges = agent.edges.filter(([source, target]) => !((source === 'qa' && ['mission', 'raid', 'chat-history'].includes(target)) || (source === 'router' && ['qa', 'form'].includes(target))))
    const dataEdges: Array<[string, string]> = draft.dataObjects.map((dataObject) => ['qa', dataObject])
    const routingEdges: Array<[string, string]> = draft.routingTargets.map((target) => ['router', target])
    return { ...agent, draft, nodes, edges: [...retainedEdges, ...dataEdges, ...routingEdges] }
  }))
  useEffect(() => {
    if (!chatHistoryAdded || selectedAgent.id !== 'agent-builder' || selectedAgent.draft.dataObjects.includes('chat-history')) return
    updateDraft({ dataObjects: [...selectedAgent.draft.dataObjects, 'chat-history'], timeHorizon: 'Last 7 Days' })
  }, [chatHistoryAdded, selectedAgent])
  const sendMessage = () => {
    const message = chatInput.trim()
    if (!message) return
    setChatThreads((current) => ({ ...current, [selectedAgent.id]: [...(current[selectedAgent.id] ?? []), { speaker: 'user', text: message }, { speaker: 'assistant', text: fixtureChatResponse(selectedAgent.name, message) }] }))
    const path = fixtureExecutionPath(selectedAgent, message)
    setExecutionPath(path)
    setLastExecutionPath(path)
    setChatInput('')
  }
  const closeConversation = () => {
    setChatThreads((current) => ({ ...current, [selectedAgent.id]: [] }))
    setExecutionPath([])
    setLastExecutionPath([])
    setChatInput('')
    setFeedbackCapture('idle')
    setFeedbackText('')
    setFeedbackEvidence(null)
  }
  const requestFeedback = () => {
    if (!chatMessages.some((message) => message.speaker === 'user')) return
    setFeedbackEvidence(captureChatEvidence(selectedAgent, chatMessages, lastExecutionPath))
    setFeedbackCapture('prompt')
  }
  const submitFeedback = () => {
    if (!feedbackEvidence || !feedbackText.trim()) return
    onUserFeedback(feedbackEvidence, feedbackText.trim())
    closeConversation()
  }
  useEffect(() => {
    const svg = document.querySelector('.agent-svg')
    if (!svg) return
    svg.querySelectorAll('.agent-network-node').forEach((element) => element.classList.remove('execution-participant'))
    svg.querySelectorAll('.agent-edge').forEach((element) => element.classList.remove('execution-edge'))
    if (!executionPath.length) return
    selectedAgent.nodes.forEach((node) => {
      if (!executionPath.includes(node.id)) return
      const element = [...svg.querySelectorAll('.agent-network-node')].find((candidate) => candidate.getAttribute('aria-label') === `Inspect ${node.label}`)
      element?.classList.add('execution-participant')
    })
    svg.querySelectorAll('.agent-edge').forEach((element, index) => {
      const [source, target] = selectedAgent.edges[index]
      if (executionPath.includes(source) && executionPath.includes(target)) element.classList.add('execution-edge')
    })
  }, [executionPath, selectedAgent])
  useEffect(() => {
    const svg = document.querySelector('.agent-svg')
    if (!svg) return
    svg.querySelectorAll('.feedback-indicator').forEach((element) => element.remove())
    selectedAgent.nodes.forEach((node) => {
      const count = unresolvedFeedbackCount(node)
      if (!count) return
      const nodeElement = [...svg.querySelectorAll('.agent-network-node')].find((candidate) => candidate.getAttribute('aria-label') === `Inspect ${node.label}`)
      if (!nodeElement) return
      const badge = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      badge.setAttribute('class', 'feedback-indicator')
      badge.setAttribute('aria-hidden', 'true')
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = `${count} unresolved feedback record${count === 1 ? '' : 's'}`
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', '133'); circle.setAttribute('cy', '10'); circle.setAttribute('r', '10')
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', '133'); text.setAttribute('y', '13.5'); text.setAttribute('text-anchor', 'middle'); text.textContent = String(count)
      badge.append(title, circle, text)
      nodeElement.append(badge)
    })
  }, [feedbackRecords, selectedAgent])
  useEffect(() => {
    const svg = document.querySelector('.agent-svg')
    if (!svg) return
    svg.querySelectorAll('.agent-network-node').forEach((element) => element.classList.remove('recommendation-target'))
    evaluatedFeedback.forEach((record) => {
      const target = selectedAgent.nodes.find((node) => node.label === record.affectedCapability)
      if (!target) return
      const element = [...svg.querySelectorAll('.agent-network-node')].find((candidate) => candidate.getAttribute('aria-label') === `Inspect ${target.label}`)
      element?.classList.add('recommendation-target')
    })
  }, [feedbackRecords, selectedAgent])
  useEffect(() => {
    const svg = document.querySelector('.agent-svg')
    if (!svg) return
    svg.querySelectorAll('.proposed-draft-relationship').forEach((element) => element.remove())
    if (!draftRecommendation || selectedAgent.draft.dataObjects.includes('chat-history')) return
    const root = svg.querySelector('g[transform]')
    if (!root) return
    const namespace = 'http://www.w3.org/2000/svg'
    const relationship = document.createElementNS(namespace, 'g')
    relationship.setAttribute('class', 'proposed-draft-relationship')
    const line = document.createElementNS(namespace, 'line')
    line.setAttribute('class', 'proposed-draft-edge'); line.setAttribute('x1', '795'); line.setAttribute('y1', '151'); line.setAttribute('x2', '850'); line.setAttribute('y2', '456')
    const node = document.createElementNS(namespace, 'g')
    node.setAttribute('class', 'proposed-draft-node'); node.setAttribute('transform', 'translate(850 425)')
    const rect = document.createElementNS(namespace, 'rect')
    rect.setAttribute('width', '145'); rect.setAttribute('height', '62'); rect.setAttribute('rx', '7')
    const type = document.createElementNS(namespace, 'text')
    type.setAttribute('x', '12'); type.setAttribute('y', '17'); type.textContent = 'PROPOSED DATA OBJECT'
    const label = document.createElementNS(namespace, 'text')
    label.setAttribute('x', '12'); label.setAttribute('y', '36'); label.textContent = 'Chat History'
    const detail = document.createElementNS(namespace, 'text')
    detail.setAttribute('x', '12'); detail.setAttribute('y', '51'); detail.textContent = 'Last 7 Days · Draft'
    node.append(rect, type, label, detail)
    relationship.append(line, node)
    root.append(relationship)
  }, [draftRecommendation, selectedAgent])
  useEffect(() => {
    const svg = document.querySelector('.agent-svg')
    if (!svg) return
    const matchingTypes: Record<Exclude<NetworkLayer, 'All'>, string[]> = {
      Experience: ['Chat', 'Agent', 'Response'],
      'Routing & Capabilities': ['Router', 'Q&A capability', 'Form / workflow', 'Agent'],
      'Context & Knowledge': ['Data Object', 'Knowledge source'],
      Models: ['Model'],
      'Feedback & Improvement': [],
    }
    const matched = new Set(activeLayer === 'All' ? selectedAgent.nodes.map((node) => node.id) : activeLayer === 'Feedback & Improvement' ? selectedAgent.nodes.filter((node) => agentFeedback.some((record) => feedbackRelatesToNode(record, node))).map((node) => node.id) : selectedAgent.nodes.filter((node) => matchingTypes[activeLayer].includes(node.type)).map((node) => node.id))
    const supporting = new Set(selectedAgent.edges.filter(([source, target]) => matched.has(source) || matched.has(target)).flatMap(([source, target]) => [source, target]))
    const pinned = new Set([selectedNodeId, ...relatedNodeIds])
    svg.querySelectorAll('.agent-network-node').forEach((element) => element.classList.remove('layer-matched', 'layer-supporting', 'layer-filtered', 'layer-pinned'))
    selectedAgent.nodes.forEach((node) => {
      const element = [...svg.querySelectorAll('.agent-network-node')].find((candidate) => candidate.getAttribute('aria-label') === `Inspect ${node.label}`)
      if (!element) return
      element.classList.add(pinned.has(node.id) ? 'layer-pinned' : matched.has(node.id) ? 'layer-matched' : supporting.has(node.id) ? 'layer-supporting' : activeLayer === 'All' ? 'layer-matched' : 'layer-filtered')
    })
    svg.querySelectorAll('.agent-edge').forEach((element, index) => {
      const [source, target] = selectedAgent.edges[index]
      element.classList.toggle('layer-edge-muted', activeLayer !== 'All' && !pinned.has(source) && !pinned.has(target) && !(matched.has(source) && matched.has(target)))
    })
  }, [activeLayer, feedbackRecords, selectedAgent, selectedNodeId])
  const NetworkInspector = ({ node, agentName, relationships }: { node: NetworkNode; agentName: string; relationships: string[] }) => <div className="network-side-panels"><div className="network-inspector-stack"><NetworkLayerFilters activeLayer={activeLayer} setActiveLayer={setActiveLayer} /><NetworkInspectorPanel node={node} agentName={agentName} relationships={relationships} draft={selectedAgent.draft} updateDraft={updateDraft} executionPath={executionPath} /><NetworkFeedbackInspector node={node} feedbackRecords={feedbackForNode} selectedFeedback={selectedFeedback} selectFeedback={setSelectedFeedbackId} applyDraft={onApplyFeedbackDraft} /></div><AgentChat agentName={selectedAgent.name} messages={chatMessages} input={chatInput} setInput={setChatInput} send={sendMessage} hasExecution={executionPath.length > 0} clearExecution={() => setExecutionPath([])} requestFeedback={requestFeedback} canEndConversation={chatMessages.some((message) => message.speaker === 'user')} feedbackCapture={feedbackCapture} feedbackText={feedbackText} setFeedbackText={setFeedbackText} provideFeedback={() => setFeedbackCapture('form')} noThanks={closeConversation} submitFeedback={submitFeedback} cancelFeedback={() => { setFeedbackCapture('idle'); setFeedbackText('') }} feedbackCount={userFeedbackCount} /></div>
  const startPan = (event: React.PointerEvent<SVGSVGElement>) => { if ((event.target as Element).closest('[role="button"]')) return; drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId) }
  const pan = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const deltaX = (event.clientX - drag.current.x) / view.scale
    const deltaY = (event.clientY - drag.current.y) / view.scale
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    setView((current) => ({ ...current, x: current.x + deltaX, y: current.y + deltaY }))
  }
  const stopPan = () => { drag.current = null }

  return <section className="agent-network-page"><div className="ab-page-heading"><div><span className="ab-kicker">AUTHENTICATED WORKSPACE</span><h1>Agent Network</h1><p>Select an agent, inspect its visual assembly, then select a node to understand the fixture configuration.</p></div><span className="network-status"><i /> {fixtureAgentNetworks.length} fixture agents · simulated</span></div><section className="interactive-network" aria-label="Agent Builder interactive network"><div className="agent-selection-bar"><div><span className="ab-kicker">SELECT AGENT</span><strong>{selectedAgent.name}</strong><small>{selectedAgent.summary}</small></div><label>Filter agents<input value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)} placeholder="Filter by name" aria-label="Filter agents by name" /></label><div className="agent-choice-list">{visibleAgents.length ? visibleAgents.map((agent) => <button key={agent.id} className={agent.id === selectedAgentId ? 'selected' : ''} onClick={() => selectAgent(agent.id)}><b>{agent.name}</b><small>{agent.summary}</small><i>{agent.state}</i></button>) : <p>No fixture agents match this filter.</p>}</div></div><div className="network-toolbar"><div><span className="ab-kicker">AGENT ASSEMBLY</span><strong>{selectedAgent.name} · {selectedAgent.summary}</strong></div><div className="network-controls" aria-label="Network controls"><button onClick={() => changeZoom(0.12)} aria-label="Zoom in">+</button><button onClick={() => changeZoom(-0.12)} aria-label="Zoom out">−</button><button onClick={fitNetwork}>Fit to network</button><button onClick={resetView}>Reset view</button></div></div><div className="network-legend"><span><i className="agent-dot" /> Selected agent</span><span><i className="capability-dot" /> Capability</span><span><i className="context-dot" /> Context</span><span><i className="model-dot" /> Model</span><small>Drag anywhere on the canvas to pan · Select any node for details · {Math.round(view.scale * 100)}%</small></div><div className="network-detail-layout"><div className="network-visual-canvas"><svg className="agent-svg" viewBox="0 0 1080 590" role="img" aria-label={`${selectedAgent.name} connected fixture network`} onPointerDown={startPan} onPointerMove={pan} onPointerUp={stopPan} onPointerCancel={stopPan}><defs><marker id="network-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M 0 0 L 9 4.5 L 0 9 z" /></marker></defs><g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>{selectedAgent.edges.map(([sourceId, targetId]) => { const source = nodeById.get(sourceId)!; const target = nodeById.get(targetId)!; const related = sourceId === selectedNodeId || targetId === selectedNodeId; return <line key={`${sourceId}-${targetId}`} className={`agent-edge ${related ? 'related' : 'unrelated'}`} x1={source.x + 145} y1={source.y + 31} x2={target.x} y2={target.y + 31} markerEnd="url(#network-arrow)" /> })}{selectedAgent.nodes.map((node) => <g key={node.id} className={`agent-network-node ${node.type === 'Agent' ? 'agent-core' : ''} ${node.id === selectedNodeId ? 'node-inspected' : relatedNodeIds.has(node.id) ? 'node-related' : 'node-dimmed'} ${node.type.toLowerCase().replace(/[^a-z]+/g, '-')}`} transform={`translate(${node.x} ${node.y})`} role="button" tabIndex={0} aria-label={`Inspect ${node.label}`} onClick={(event) => { event.stopPropagation(); setSelectedNodeId(node.id) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedNodeId(node.id) } }}><rect width="145" height="62" rx="7" /><text className="node-type" x="12" y="17">{node.type.toUpperCase()}</text><text className="node-label" x="12" y="36">{node.label}</text><text className="node-detail" x="12" y="51">{node.detail}</text></g>)}</g></svg><div className="network-caption"><div><span>SELECTED AGENT</span><b>{selectedAgent.name}</b><small>{selectedAgent.state} fixture · network redrawn from this agent’s local configuration</small></div><div><span>SELECTED NODE</span><b>{selectedNode.label}</b><small>{selectedNode.type} · {selectedNode.detail} · read-only fixture node</small></div><p>Chat → Router → capability / workflow → Data Objects & knowledge → Model → Response</p><small>{chatHistoryAdded ? 'Draft context update is connected: Chat History · Last 7 Days.' : 'All nodes are fixture-only and read-only. Node editing is not available.'}</small></div></div><NetworkInspector node={selectedNode} agentName={selectedAgent.name} relationships={relationships} /></div></section><section className="workspace-tools"><article><span>01</span><h2>Agent overview</h2><p>Review the operating model and future self-improvement capability.</p><button onClick={() => goTo('Overview')}>Open overview <span>→</span></button></article><article><span>02</span><h2>Configure capabilities</h2><p>Inspect routing, Data Objects, horizons and Draft changes.</p><button onClick={() => goTo('Builder')}>Open Builder <span>→</span></button></article><article><span>03</span><h2>Run agent tests</h2><p>Use fixture personas to expose experience failures.</p><button onClick={() => goTo('Agent Testers')}>Open Agent Testers <span>→</span></button></article><article><span>04</span><h2>Review feedback</h2><p>Evaluate evidence and apply human-reviewed recommendations.</p><button onClick={() => goTo('Feedback')}>Open Feedback <span>→</span></button></article></section></section>
}

function NetworkLayerFilters({ activeLayer, setActiveLayer }: { activeLayer: NetworkLayer; setActiveLayer: (layer: NetworkLayer) => void }) {
  const layers: NetworkLayer[] = ['All', 'Experience', 'Routing & Capabilities', 'Context & Knowledge', 'Models', 'Feedback & Improvement']
  return <section className="network-layer-filters" aria-label="Network layer filters"><span className="ab-kicker">NETWORK LAYERS</span><div>{layers.map((layer) => <button key={layer} type="button" className={activeLayer === layer ? 'active' : ''} onClick={() => setActiveLayer(layer)}>{layer}</button>)}</div></section>
}

function NetworkInspectorPanel({ node, agentName, relationships, draft, updateDraft, executionPath }: { node: NetworkNode; agentName: string; relationships: string[]; draft: AgentDraft; updateDraft: (changes: Partial<AgentDraft>) => void; executionPath: string[] }) {
  const isPortfolio = agentName === 'Portfolio Navigator'
  const capability = isPortfolio ? 'Portfolio Health' : 'RAID Analysis'
  const workflow = isPortfolio ? 'Decision Brief' : 'Escalation Intake'
  const dataObjectOptions = isPortfolio ? [{ id: 'mission', label: 'Portfolio' }, { id: 'raid', label: 'Outcomes' }, { id: 'chat-history', label: 'Chat History' }] : [{ id: 'mission', label: 'Mission' }, { id: 'raid', label: 'RAID Items' }, { id: 'chat-history', label: 'Chat History' }]
  const baseDescription = node.type === 'Q&A capability' ? `Answers ${isPortfolio ? 'portfolio health and decision' : 'material delivery-risk'} questions using structured context.` : node.type === 'Data Object' ? `Structured ${node.label} context available to the connected capability without exposing configuration changes here.` : node.type === 'Model' ? 'Produces the fixture response after the selected capability assembles its route and context.' : node.type === 'Router' ? 'Classifies the chat intent and selects the best fixture capability or workflow.' : node.type === 'Form / workflow' ? 'Guides the user through a structured fixture workflow when the route requires it.' : node.type === 'Chat' ? 'The same user-facing entry point used by people and Agent Testers.' : node.type === 'Knowledge source' ? 'Reference guidance available to the connected capability.' : node.type === 'Response' ? 'The final fixture output returned to the user in Chat.' : 'The selected agent coordinates chat, routing, capabilities and context.'
  const executionStatus = executionRole(node, executionPath)
  const description = `${baseDescription}${executionStatus ? ` Latest execution: participated — ${executionStatus}.` : executionPath.length ? ' Not used in the latest execution.' : ''}`
  const toggleDataObject = (id: string) => updateDraft({ dataObjects: draft.dataObjects.includes(id) ? draft.dataObjects.filter((item) => item !== id) : [...draft.dataObjects, id] })
  const toggleRoute = (id: string) => updateDraft({ routingTargets: draft.routingTargets.includes(id) ? draft.routingTargets.filter((item) => item !== id) : [...draft.routingTargets, id] })
  return <aside className="network-node-inspector ab-inspector" aria-label="Node Inspector"><span className="ab-kicker">DRAFT NODE INSPECTOR</span><h2>{node.label}</h2><p>{description}</p><div className="draft-config-note">Draft configuration · local fixture state only</div><div className="inspector-group"><span>Node type</span><b>{node.type}</b></div><div className="inspector-group"><span>Relationships</span><div className="network-relationship-list">{relationships.length ? relationships.map((relationship) => <b key={relationship}>{relationship}</b>) : <small>No direct fixture relationships.</small>}</div></div>{node.type === 'Q&A capability' && <><label className="network-edit-field">Purpose<textarea value={draft.qaDescription} onChange={(event) => updateDraft({ qaDescription: event.target.value })} /></label><label className="network-edit-field">Target model<select value={draft.targetModel} onChange={(event) => updateDraft({ targetModel: event.target.value })}><option>gpt-5</option><option>gpt-4.1</option></select></label><label className="network-edit-field">Time horizon<select value={draft.timeHorizon} onChange={(event) => updateDraft({ timeHorizon: event.target.value })}><option>Current reporting period</option><option>Last 7 Days</option><option>Current quarter</option></select></label><fieldset className="network-edit-field"><legend>Data Objects</legend>{dataObjectOptions.map((item) => <label key={item.id}><input type="checkbox" checked={draft.dataObjects.includes(item.id)} onChange={() => toggleDataObject(item.id)} /> {item.label}</label>)}</fieldset><fieldset className="network-edit-field"><legend>Routing relationship</legend><label><input type="checkbox" checked={draft.routingTargets.includes('qa')} onChange={() => toggleRoute('qa')} /> Route from {isPortfolio ? 'Portfolio Router' : 'Intent Router'}</label></fieldset></>}{node.type === 'Data Object' && <><div className="inspector-group"><span>Description</span><b>{node.detail}</b></div><div className="inspector-group"><span>Capabilities consuming it</span><b>{capability} · {workflow}</b></div><label className="network-edit-field">Configured scope<select value={draft.timeHorizon} onChange={(event) => updateDraft({ timeHorizon: event.target.value })}><option>Current reporting period</option><option>Last 7 Days</option><option>Current quarter</option></select></label>{node.id === 'chat-history' && <button className="remove-draft-link" onClick={() => toggleDataObject('chat-history')}>Remove Chat History relationship</button>}</>}{node.type === 'Model' && <><div className="inspector-group"><span>Model</span><b>{draft.targetModel}</b></div><label className="network-edit-field">Reasoning level<select value={draft.reasoningLevel} onChange={(event) => updateDraft({ reasoningLevel: event.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label><div className="inspector-group"><span>Capabilities using it</span><b>{capability} · {workflow}</b></div></>}{node.type === 'Router' && <><div className="inspector-group"><span>Routing rules</span><b>Classify delivery or portfolio intent, then select a capability or guided workflow.</b></div><fieldset className="network-edit-field"><legend>Target capabilities</legend><label><input type="checkbox" checked={draft.routingTargets.includes('qa')} onChange={() => toggleRoute('qa')} /> {capability}</label><label><input type="checkbox" checked={draft.routingTargets.includes('form')} onChange={() => toggleRoute('form')} /> {workflow}</label></fieldset><div className="inspector-group"><span>Fixture behaviour</span><b>{node.detail} · asks for clarification only when the intent is ambiguous.</b></div></>}{!['Q&A capability', 'Data Object', 'Model', 'Router'].includes(node.type) && <div className="readonly-node-note">Read-only fixture configuration · editing is not available for this node type.</div>}</aside>
}

function NetworkFeedbackInspector({ node, feedbackRecords, selectedFeedback, selectFeedback, applyDraft }: { node: NetworkNode; feedbackRecords: FeedbackRecord[]; selectedFeedback: FeedbackRecord | null; selectFeedback: (id: string) => void; applyDraft: (recordId: string) => void }) {
  const evidenceTurns = selectedFeedback?.sourceType === 'user' ? (selectedFeedback.evidence as ChatFeedbackEvidence).transcript.map((turn) => `${turn.speaker === 'assistant' ? 'Assistant' : 'User'}: ${turn.text}`) : selectedFeedback ? (selectedFeedback.evidence as AgentTesterFeedbackEvidence).transcript.map(([speaker, text]) => `${speaker}: ${text}`) : []
  const recommendation = feedbackRecords.find((record) => record.sourceType === 'agent-tester' && record.status === 'Evaluated' && record.affectedCapability === node.label)
  return <section className="network-feedback-inspector" aria-label="Related Feedback"><span className="ab-kicker">RELATED FEEDBACK</span><h3>{node.label}</h3>{recommendation && <div className="network-recommendation"><b>Proposed Draft change</b><span>Add Data Object: <strong>Chat History</strong></span><span>Horizon: <strong>Last 7 Days</strong></span><button type="button" onClick={() => applyDraft(recommendation.id)}>Apply to Draft</button></div>}{feedbackRecords.length ? <><div className="node-feedback-list">{feedbackRecords.map((record) => <button key={record.id} className={record.id === selectedFeedback?.id ? 'selected' : ''} onClick={() => selectFeedback(record.id)}><span>{record.sourceType === 'user' ? 'USER' : 'AGENT TESTER'} · {record.status}</span><b>{record.content}</b><small>{new Date(record.createdTime).toLocaleString()}</small></button>)}</div>{selectedFeedback && <div className="node-feedback-evidence"><b>Evidence for {selectedFeedback.id}</b><p>{selectedFeedback.relatedInteraction}</p><dl><dt>Capability</dt><dd>{selectedFeedback.affectedCapability ?? 'Not identified'}</dd><dt>Route</dt><dd>{selectedFeedback.evidence.route}</dd><dt>Data Objects</dt><dd>{selectedFeedback.evidence.dataObjects.join(' · ') || 'None recorded'}</dd></dl><div className="node-evidence-transcript">{evidenceTurns.map((turn, index) => <p key={index}>{turn}</p>)}</div></div>}</> : <p className="node-feedback-empty">No Feedback records are related to this node.</p>}</section>
}

function AgentChat({ agentName, messages, input, setInput, send, hasExecution, clearExecution, requestFeedback, canEndConversation, feedbackCapture, feedbackText, setFeedbackText, provideFeedback, noThanks, submitFeedback, cancelFeedback, feedbackCount }: { agentName: string; messages: ChatMessage[]; input: string; setInput: (value: string) => void; send: () => void; hasExecution: boolean; clearExecution: () => void; requestFeedback: () => void; canEndConversation: boolean; feedbackCapture: FeedbackCaptureState; feedbackText: string; setFeedbackText: (value: string) => void; provideFeedback: () => void; noThanks: () => void; submitFeedback: () => void; cancelFeedback: () => void; feedbackCount: number }) {
  return <section className="agent-chat-panel" aria-label="Chat with Agent"><div className="agent-chat-heading"><div><span className="ab-kicker">CHAT WITH AGENT</span><h2>{agentName}</h2></div><i>Fixture</i></div>{hasExecution && <div className="execution-status"><span>Latest execution highlighted</span><button type="button" onClick={clearExecution}>Clear trace</button></div>}<div className="agent-chat-history" aria-label={`${agentName} conversation history`}>{messages.length ? messages.map((message, index) => <article key={`${message.speaker}-${index}`} className={message.speaker}><span>{message.speaker === 'assistant' ? 'AB' : 'YOU'}</span><p>{message.text}</p></article>) : <p className="empty-chat">This interaction is closed. Send a message to start another fixture conversation.</p>}</div>{feedbackCapture === 'prompt' && <div className="chat-feedback-prompt"><b>Would you like to provide feedback on this interaction?</b><div><button type="button" className="feedback-primary" onClick={provideFeedback}>Provide feedback</button><button type="button" onClick={noThanks}>No thanks</button></div></div>}{feedbackCapture === 'form' && <form className="chat-feedback-form" onSubmit={(event) => { event.preventDefault(); submitFeedback() }}><label>What worked well or could be improved about the assistant?<textarea value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} required /></label><div><button type="submit" className="feedback-primary">Submit feedback</button><button type="button" onClick={cancelFeedback}>Cancel</button></div></form>}<form className="agent-chat-form" onSubmit={(event) => { event.preventDefault(); send() }}><label>Message<input value={input} onChange={(event) => setInput(event.target.value)} placeholder={`Ask ${agentName} a fixture question`} /></label><button type="submit" aria-label="Send message">Send <span>→</span></button></form><div className="agent-chat-actions"><button type="button" onClick={requestFeedback} disabled={!canEndConversation}>End conversation</button><button type="button" onClick={requestFeedback} disabled={!canEndConversation}>Clear conversation</button>{feedbackCount > 0 && <small>{feedbackCount} feedback record{feedbackCount === 1 ? '' : 's'} saved locally · no evaluation started.</small>}</div><small>Deterministic fixture responses only · no external model or API call.</small></section>
}

function Overview({ goTo }: { goTo: (page: Page) => void }) {
  return <>
    <section className="ab-hero"><div><span className="ab-kicker">AGENT BUILDER</span><h1>Build assistants that make the next decision clearer.</h1><p>Configure the capabilities, context and feedback loops that turn complex operational questions into useful conversations.</p><button className="ab-primary" onClick={() => goTo('Builder')}>Open Builder <span>→</span></button></div><div className="ab-layer-visual" aria-label="Four layer operating model"><b>1</b><span>Knowledge</span><b>2</b><span>Capabilities</span><b>3</b><span>Conversation</span><b className="layer-four">4</b><span>Feedback & improvement</span></div></section>
    <section className="ab-section-heading"><span>OPERATING MODEL</span><h2>One configured system, four connected layers.</h2><p>Agent Builder keeps the route, context and response visible so teams can improve deliberately.</p></section>
    <section className="ab-layer-grid">
      {['Knowledge & data objects', 'Capabilities & routing', 'Chat experience', 'Feedback & improvement'].map((title, i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{i === 3 ? 'Observed feedback and synthetic testing feed the same evaluation and recommendation lifecycle.' : 'A clear, inspectable part of the assistant experience.'}</p></article>)}
    </section>
    <section className="ab-coming-soon">
      <div className="ab-coming-copy"><span className="coming-badge">COMING SOON · SELF-IMPROVEMENT</span><h2>Let your users test your AI — before they are users.</h2><p>Create AI personas that behave like the people your assistant is designed to support. Agent Testers will interact with your assistant, challenge its routing, reasoning and workflows, and systematically identify where the experience breaks down.</p><p className="ab-quote">Testing from the outside exposes failures that configuration review alone cannot see.</p></div>
      <div className="ab-loop" aria-label="Persona to improvement loop"><div className="loop-user">Persona<br /><small>simulated user</small></div><i>→</i><div>Chat interaction</div><i>→</i><div>Agent Builder</div><i>→</i><div>Test result</div><i>→</i><div>Feedback</div><i>→</i><div className="loop-improve">Improvement</div><span>Configuration loop</span></div>
      <div className="ab-steps"><article><b>1</b><h3>Define the user</h3><p>Describe the people your assistant needs to serve.</p></article><article><b>2</b><h3>Let them test it</h3><p>AI personas hold realistic conversations and pursue real objectives.</p></article><article><b>3</b><h3>Improve systematically</h3><p>Failed interactions become evidence for targeted changes.</p></article></div>
      <p className="ab-future">From waiting for users to discover problems to continuously testing how the system performs before they do.</p>
      <button className="ab-secondary" onClick={() => goTo('Agent Testers')}>Explore the future experience <span>→</span></button>
    </section>
    <section className="ab-final-cta"><h2>Make each assistant interaction easier to trust.</h2><button className="ab-primary" onClick={() => goTo('Builder')}>Open Builder <span>→</span></button></section>
  </>
}

function Builder({ chatHistoryAdded, finding, goTesters }: { chatHistoryAdded: boolean; finding: boolean; goTesters: () => void }) {
  return <section className="ab-builder-page">
    <div className="ab-page-heading"><div><span className="ab-kicker">LAYER 2 · CAPABILITIES</span><h1>Builder</h1><p>Shape what the assistant can do, how it routes, and what context each capability receives.</p></div><button className="ab-secondary" onClick={goTesters}>Open Agent Testers <span>→</span></button></div>
    {finding && <aside className="ab-finding-link"><span>LINKED FINDING</span><strong>RAID Analysis does not consider recent conversation context.</strong><small>Opened from Agent Testers · source retained for review</small></aside>}
    <div className="ab-builder-grid"><aside className="ab-builder-list"><div className="list-heading"><b>Capabilities</b><button>+ Add</button></div><button className="capability active"><span>Q&A</span><div><strong>RAID Analysis</strong><small>Mission health and delivery risks</small></div><i>93%</i></button><button className="capability"><span>Q&A</span><div><strong>Mission Overview</strong><small>Concise strategic summaries</small></div></button><button className="capability"><span>FORM</span><div><strong>Escalation intake</strong><small>Guided risk workflow</small></div></button></aside><section className="ab-builder-canvas"><div className="canvas-path"><span>Chat</span><i>→</i><b>Route: RAID Analysis</b><i>→</i><span>Response</span></div><div className="execution-card"><span className="route-dot" /> <div><strong>Current fixture target</strong><p>The tester enters through the same Chat route as a real user. Focused tests never bypass routing.</p></div></div><div className="builder-note"><b>Human-controlled change lifecycle</b><p>Test → Finding → Feedback → Evaluation → Recommendation → Human-reviewed Draft Change</p></div></section><aside className="ab-inspector"><span className="ab-kicker">INSPECTOR</span><h2>RAID Analysis</h2><p>Determine material delivery concerns requiring management attention.</p><label>Target models <select defaultValue="gpt-5"><option>gpt-5</option></select></label><label>Routing confidence <div className="confidence"><span /><b>93%</b></div></label><div className="inspector-group"><span>Data Objects</span><b>Mission · RAID items · Outcomes</b>{chatHistoryAdded && <b className="added-data">Chat History</b>}</div><div className="inspector-group"><span>Time horizon</span><b>{chatHistoryAdded ? 'Last 7 days' : 'Current reporting period'}</b></div><div className={`draft-change ${chatHistoryAdded ? 'applied' : ''}`}><span>{chatHistoryAdded ? 'DRAFT UPDATED' : 'DRAFT STATUS'}</span><strong>{chatHistoryAdded ? 'Chat History added' : 'No pending changes'}</strong><p>{chatHistoryAdded ? 'Human-reviewed recommendation applied to the Draft configuration.' : 'Agent Testers can identify issues but cannot modify this configuration.'}</p></div></aside></div>
  </section>
}

function Testers(props: { selectedPersona: string; setSelectedPersona: (value: string) => void; personaOpen: boolean; setPersonaOpen: (value: boolean) => void; runState: RunState; runTest: () => void; testPackRun: boolean; setTestPackRun: (value: boolean) => void; transcript: string[][]; feedbackCreated: boolean; createFeedback: () => void; openBuilder: () => void; chatHistoryAdded: boolean; openHistory: (state: RunState) => void }) {
  const { selectedPersona, setSelectedPersona, personaOpen, setPersonaOpen, runState, runTest, testPackRun, setTestPackRun, transcript, feedbackCreated, createFeedback, openBuilder, chatHistoryAdded, openHistory } = props
  const [createdPersona, setCreatedPersona] = useState<string | null>(null)
  const [target, setTarget] = useState('Full Assistant')
  const hasRun = runState !== 'idle'
  const personaCatalogue = createdPersona ? [...personas, { name: createdPersona, role: 'Custom test persona', summary: 'Natural-language fixture configuration saved from the Inspector.', state: 'Draft' }] : personas
  const currentPersona = personaCatalogue.find((persona) => persona.name === selectedPersona) ?? personas[0]
  return <section className="ab-testers-page">
    <div className="ab-page-heading"><div><span className="ab-kicker">LAYER 4 · FEEDBACK & IMPROVEMENT</span><h1>Agent Testers</h1><p>Simulate real users, test complete conversations and identify where your assistant needs to improve.</p></div><div className="ab-tester-metrics"><span><b>4</b> Personas</span><span><b>12</b> Tests</span><span><b>{chatHistoryAdded ? '92%' : '83%'}</b> Passed</span><span><b>{chatHistoryAdded ? '4' : '5'}</b> Findings</span></div></div>
    <div className="ab-tester-grid"><aside className="tester-personas"><div className="list-heading"><div><span className="ab-kicker">PERSONAS</span><h2>Test Personas</h2></div><button onClick={() => setPersonaOpen(true)}>+ Add Persona</button></div>{personaCatalogue.map((persona) => <button key={persona.name} className={`persona-card ${selectedPersona === persona.name ? 'selected' : ''}`} onClick={() => setSelectedPersona(persona.name)}><span className="persona-avatar">{persona.name.split(' ').map(x => x[0]).join('')}</span><div><strong>{persona.name}</strong><small>{persona.role}</small><p>{persona.summary}</p></div><i className={persona.state === 'Draft' ? 'draft' : ''}>{persona.state}</i></button>)}<div className="persona-profile"><span>INSPECTED PERSONA</span><strong>{currentPersona.name}</strong><b>{currentPersona.role}</b><p>{currentPersona.summary}</p><small>Tester Model · OpenAI / gpt-5 / Medium reasoning</small></div><div className="test-pack"><span>TEST SERIES</span><strong>Delivery Manager Test Pack</strong><small>Mission health · Risk · Overdue Outcome · Release dependency · Ambiguous question</small><button onClick={() => setTestPackRun(true)}>{testPackRun ? 'Pack complete · 4 passed / 1 issue' : 'Run Test Pack'}</button></div></aside>
      <section className="tester-test"><div className="test-header"><div><span className="ab-kicker">TEST</span><h2>Management attention check</h2></div><span className={hasRun ? `result-pill ${runState}` : 'result-pill'}>{runState === 'issues' ? 'Passed with Issues' : runState === 'passed' ? 'Passed' : 'Ready'}</span></div><div className="test-fields"><label>Persona<select value={selectedPersona} onChange={e => setSelectedPersona(e.target.value)}>{personaCatalogue.map(x => <option key={x.name}>{x.name}</option>)}</select></label><label>Target<select value={target} onChange={event => setTarget(event.target.value)}><option>Full Assistant</option><option>Focused Capability · RAID Analysis Q&A</option><option>Focused Capability · Escalation Intake Form</option></select><small>Every test enters through Chat so routing remains testable.</small></label><label>Test Objective<textarea defaultValue="Determine whether the Digital Investment Platform Mission has material delivery concerns requiring management attention." /></label><label>Scenario context<textarea defaultValue="The Delivery Manager has heard there may be a dependency affecting a September release but does not know which Outcome it relates to." /><small>Available only to the tester; never silently injected into the assistant.</small></label><label>Successful Outcome<textarea defaultValue="The user understands the material risks, why they matter, which delivery areas are affected and whether escalation is required." /></label></div><div className="tester-model"><span>TESTER MODEL</span><b>Simulated user</b><select defaultValue="OpenAI"><option>OpenAI</option></select><select defaultValue="gpt-5"><option>gpt-5</option></select><select defaultValue="Medium"><option>Medium reasoning</option></select><small>Distinct from Target Models configured within Agent Builder Q&As.</small></div><button className="ab-primary run-test" onClick={runTest}>{chatHistoryAdded ? 'Retest' : 'Run Test'} <span>→</span></button>{hasRun && <div className="run-history"><span>TEST HISTORY · select a run to reopen its evidence</span><button onClick={() => openHistory(runState)}><b>Today, 10:24 · Management attention check</b><small>Delivery Manager · Objective: assess management attention · {runState === 'passed' ? 'Passed' : 'Passed with Issues'} · 6 turns · {runState === 'passed' ? '0' : '1'} finding</small></button>{runState === 'passed' && <button onClick={() => openHistory('issues')}><b>Today, 10:12 · Management attention check</b><small>Delivery Manager · Objective: assess management attention · Passed with Issues · 6 turns · 1 finding</small></button>}</div>}</section>
      <aside className="tester-findings"><span className="ab-kicker">FINDINGS</span>{!hasRun ? <div className="empty-findings"><b>Ready to observe the experience.</b><p>Run the fixture test to see the conversation, execution trace and evaluation.</p></div> : <><div className="result-summary"><span className={runState === 'passed' ? 'pass-icon' : 'issue-icon'}>{runState === 'passed' ? '✓' : '!'}</span><div><strong>{runState === 'passed' ? 'Successful outcome achieved' : 'One material issue found'}</strong><p>{runState === 'passed' ? 'The tester received a timely, evidence-based escalation recommendation.' : 'The Delivery Manager did not receive recent conversation context.'}</p></div></div>{runState === 'issues' && <article className="finding-card"><div><span>Timeliness</span><b>High</b></div><h3>RAID Analysis does not consider recent conversation context.</h3><dl><dt>Observed</dt><dd>Structured RAID information was retrieved but the release dependency discussed earlier in the week was ignored.</dd><dt>Expected</dt><dd>The Delivery Manager expected the answer to incorporate recent conversation context.</dd><dt>Route</dt><dd>RAID Analysis · Mission, RAID items, Outcomes</dd><dt>Evidence</dt><dd>Turn 5: “What about the release dependency that was discussed earlier this week?”</dd></dl><button className="ab-secondary" onClick={openBuilder}>Open Target in Builder <span>→</span></button><button className="create-feedback" onClick={createFeedback}>{feedbackCreated ? 'Feedback created · Open Feedback' : 'Create Feedback'} <span>→</span></button></article>}<div className="evaluation-checks"><span>TEST EVALUATION</span>{['Routing', 'Clarification', 'Context', 'Timeliness', 'Chat History', 'Reasoning', 'Form workflow', 'Response usefulness'].map((item) => <div key={item}><i className={item === 'Chat History' && runState === 'issues' ? 'fail' : ''}>{item === 'Chat History' && runState === 'issues' ? '!' : '✓'}</i>{item}</div>)}</div></>}</aside></div>
    {hasRun && <section className="conversation-section"><div><span className="ab-kicker">LIVE SIMULATED CONVERSATION</span><h2>Tester conversation through Chat</h2><p>The tester behaves as a user persona, pursuing its own objective over multiple turns.</p></div><div className="conversation-layout"><div className="transcript">{transcript.map(([speaker, message], index) => <article key={index} className={speaker === 'Assistant' ? 'assistant-turn' : 'tester-turn'}><span>{speaker === 'Assistant' ? 'AB' : 'DM'}</span><div><b>{speaker}</b><p>{message}</p></div></article>)}</div><div className="execution-trace"><span className="ab-kicker">TARGET EXECUTION</span><h3>Inspectable route</h3><div><span>1</span><b>Chat entry</b><small>Same interface as a real user · target: {target}</small></div><div><span>2</span><b>Q&A selected · routing confidence</b><small>RAID Analysis · 93% confidence</small></div><div><span>3</span><b>Form selected</b><small>Escalation Intake available; not invoked for this Mission-health conversation</small></div><div><span>4</span><b>Clarification</b><small>Not required: the Mission and intent were stated clearly</small></div><div><span>5</span><b>Data Objects and horizon</b><small>Mission · RAID items · Outcomes{runState === 'passed' ? ' · Chat History · Last 7 Days' : ' · Current reporting period'}</small></div><div><span>6</span><b>Execution trace</b><small>{runState === 'passed' ? 'Chat History informs response' : 'No Chat History available'}</small></div></div></div></section>}
    {personaOpen && <PersonaInspector close={() => setPersonaOpen(false)} save={(name) => { setCreatedPersona(name); setSelectedPersona(name); setPersonaOpen(false) }} />}
  </section>
}

function PersonaInspector({ close, save }: { close: () => void; save: (name: string) => void }) { const [name, setName] = useState('New Delivery Lead'); return <div className="inspector-overlay" role="dialog" aria-modal="true" aria-label="Add Persona"><section><button className="close" onClick={close}>×</button><span className="ab-kicker">PERSONA INSPECTOR</span><h2>Add Persona</h2><p>Natural-language instructions define how the simulated user thinks and behaves.</p><label>Name<input value={name} onChange={event => setName(event.target.value)} /></label><label>Role<input defaultValue="Responsible for coordinating delivery and escalating material delivery concerns." /></label><label>Persona Description<textarea defaultValue="Pragmatic and time-poor. Understands delivery concepts but does not know the underlying AI architecture. Usually asks short questions, expects clear recommendations and challenges responses that lack evidence." /></label><label>Objectives<textarea defaultValue={'Understand whether delivery is on track; identify material risks; understand what requires escalation; determine who owns the next action.'} /></label><label>Knowledge<textarea defaultValue="Understands Missions, Outcomes and delivery terminology, but does not know Agent Builder's Q&A catalogue or Data Object structure." /></label><label>Interaction Behaviour<textarea defaultValue="Ask follow-up questions when the response is vague. Do not volunteer information unless asked. Challenge assertions that are not supported by evidence." /></label><div className="model-config"><b>Tester Model</b><select><option>OpenAI</option></select><select><option>gpt-5</option></select><select><option>Medium reasoning</option></select></div><button className="ab-primary" onClick={() => save(name.trim() || 'New Delivery Lead')}>Save Persona <span>→</span></button></section></div> }

function Feedback({ feedbackRecords, chatHistoryAdded, evaluate: evaluateRecord, applyDraft: applyDraftRecord, retest, openBuilder }: { feedbackRecords: FeedbackRecord[]; chatHistoryAdded: boolean; evaluate: (recordId: string) => void; applyDraft: (recordId: string) => void; retest: () => void; openBuilder: () => void }) {
  const selectedRecord = feedbackRecords[feedbackRecords.length - 1]
  const agentTesterRecord = selectedRecord?.sourceType === 'agent-tester'
  const userEvidence = selectedRecord?.sourceType === 'user' ? selectedRecord.evidence as ChatFeedbackEvidence : null
  const testerEvidence = selectedRecord?.sourceType === 'agent-tester' ? selectedRecord.evidence as AgentTesterFeedbackEvidence : null
  const evidenceSummary = userEvidence ? `${userEvidence.transcript.length} transcript turns · ${userEvidence.executionPath.join(' → ') || 'No execution path recorded'}` : testerEvidence ? `${testerEvidence.persona} · ${testerEvidence.transcript.length} transcript turns · ${testerEvidence.horizon}` : ''
  const evaluate = (_event?: unknown) => { if (selectedRecord) evaluateRecord(selectedRecord.id) }
  const applyDraft = (_event?: unknown) => { if (selectedRecord) applyDraftRecord(selectedRecord.id) }
  const evaluated = selectedRecord?.status !== 'New'
  if (selectedRecord?.status === 'New') return <section className="ab-feedback-page"><div className="ab-page-heading"><div><span className="ab-kicker">LAYER 4 · FEEDBACK RECORD</span><h1>Feedback</h1><p>Evidence is ready for deterministic evaluation. No recommendation has been generated.</p></div></div><div className="feedback-workspace"><section className="feedback-record"><div className="source-badge">SOURCE · {selectedRecord.sourceType === 'user' ? 'USER' : 'AGENT TESTER'}</div><h2>{selectedRecord.content}</h2><p>{selectedRecord.relatedInteraction}</p><div className="feedback-meta"><span>ID <b>{selectedRecord.id}</b></span><span>Agent <b>{selectedRecord.agent}</b></span><span>Capability <b>{selectedRecord.affectedCapability ?? 'Not identified'}</b></span><span>Status <b>New</b></span></div><p className="feedback-evidence"><b>Interaction evidence:</b> {evidenceSummary}</p></section><section className="recommendation"><span className="ab-kicker">NEXT STEP</span><h2>Evaluate this Feedback</h2><p>Evaluation will diagnose the issue from the retained evidence. It will not modify Agent Builder configuration.</p><button className="ab-primary" onClick={() => evaluate(selectedRecord.id)}>Evaluate Feedback <span>→</span></button></section></div><aside className="human-control"><b>Human control remains required.</b><p>New Feedback exposes source evidence and affected configuration only. Recommendations follow evaluation.</p></aside></section>
  if (selectedRecord && !agentTesterRecord) return <section className="ab-feedback-page"><div className="ab-page-heading"><div><span className="ab-kicker">LAYER 4 · EVALUATED USER FEEDBACK</span><h1>Feedback</h1><p>The deterministic evaluation is complete. Configuration remains unchanged.</p></div></div><div className="feedback-workspace"><section className="feedback-record"><div className="source-badge">SOURCE · USER</div><h2>{selectedRecord.content}</h2><p>{selectedRecord.relatedInteraction}</p><div className="feedback-meta"><span>ID <b>{selectedRecord.id}</b></span><span>Agent <b>{selectedRecord.agent}</b></span><span>Capability <b>{selectedRecord.affectedCapability ?? 'Not identified'}</b></span><span>Status <b>{selectedRecord.status}</b></span></div><p className="feedback-evidence"><b>Interaction evidence:</b> {evidenceSummary}</p></section><section className="recommendation"><span className="ab-kicker">EVALUATION SUMMARY</span><h2>Captured interaction needs human review</h2><div className="recommendation-row"><span>Diagnosed issue</span><b>Response usefulness requires review against the user’s evidence.</b></div><div className="recommendation-row"><span>Affected component</span><b>{selectedRecord.affectedCapability ?? 'Route and response'}</b></div><div className="recommendation-row"><span>Recommended improvement</span><b>Review the configured capability and its available context against the retained transcript.</b></div><p>Rationale: the feedback is tied to the recorded route, Data Objects and response path. This deterministic evaluation does not make a Draft change.</p></section></div><aside className="human-control"><b>Human control remains required.</b><p>Evaluation produces a recommendation only. A person must decide whether a configuration change is appropriate.</p></aside></section>
  if (selectedRecord && agentTesterRecord && selectedRecord.status === 'Evaluated') return <section className="ab-feedback-page"><div className="ab-page-heading"><div><span className="ab-kicker">LAYER 4 · EVALUATED AGENT TESTER FEEDBACK</span><h1>Feedback</h1><p>The deterministic evaluation is complete. Configuration remains unchanged until a human applies a Draft change.</p></div></div><div className="feedback-workspace"><section className="feedback-record"><div className="source-badge">SOURCE · AGENT TESTER</div><h2>{selectedRecord.content}</h2><p>{selectedRecord.relatedInteraction}</p><div className="feedback-meta"><span>ID <b>{selectedRecord.id}</b></span><span>Agent <b>{selectedRecord.agent}</b></span><span>Capability <b>{selectedRecord.affectedCapability}</b></span><span>Status <b>{selectedRecord.status}</b></span></div><p className="feedback-evidence"><b>Interaction evidence:</b> {evidenceSummary}</p></section><section className="recommendation"><span className="ab-kicker">EVALUATION SUMMARY</span><h2>Missing recent conversation context</h2><div className="recommendation-row"><span>Diagnosed issue</span><b>RAID Analysis retrieved structured data but did not consider recent Chat History.</b></div><div className="recommendation-row"><span>Affected component</span><b>RAID Analysis</b></div><div className="recommendation-row"><span>Recommended improvement</span><b>Add Chat History with a Last 7 Days horizon.</b></div><p>Rationale: the tester’s transcript identifies a release dependency raised earlier in the week; supplying that evidence to the capability makes its risk response timely and useful.</p><button className="ab-primary" onClick={applyDraft}>Apply to Draft <span>→</span></button></section></div><aside className="human-control"><b>Human control remains required.</b><p>Evaluation created a recommendation only. Apply to Draft is a separate human-reviewed action.</p></aside></section>
  return <section className="ab-feedback-page"><div className="ab-page-heading"><div><span className="ab-kicker">LAYER 4 · UNIFIED IMPROVEMENT LOOP</span><h1>Feedback</h1><p>Observed user feedback and Agent Tester findings share one local evidence-led record model.</p></div></div><div className="feedback-flow"><div><b>Real User</b><span>Interaction → User Feedback → Evaluation → Recommendation</span></div><div className="synthetic"><b>Agent Tester</b><span>Synthetic Interaction → Test Finding → Feedback → Evaluation → Recommendation</span></div></div>{!selectedRecord ? <div className="feedback-empty"><h2>No feedback records</h2><p>End a Chat conversation or create Feedback from an Agent Tester Finding to add a local record.</p><button className="ab-primary" onClick={openBuilder}>Open Builder <span>→</span></button></div> : <div className="feedback-workspace"><section className="feedback-record"><div className="source-badge">SOURCE · {selectedRecord.sourceType === 'user' ? 'USER' : 'AGENT TESTER'}</div><h2>{selectedRecord.content}</h2><p>{selectedRecord.relatedInteraction}</p><div className="feedback-meta"><span>ID <b>{selectedRecord.id}</b></span><span>Agent <b>{selectedRecord.agent}</b></span><span>Capability <b>{selectedRecord.affectedCapability ?? 'Not identified'}</b></span><span>Status <b>{selectedRecord.status}</b></span></div><p className="feedback-evidence"><b>Associated evidence:</b> {evidenceSummary}</p></section>{agentTesterRecord ? <section className="recommendation"><span className="ab-kicker">EVALUATION</span><h2>Targeted improvement recommendation</h2><div className="recommendation-row"><span>Target</span><b>RAID Analysis</b></div><div className="recommendation-row"><span>Add Data Object</span><b>Chat History</b></div><div className="recommendation-row"><span>Horizon</span><b>Last 7 Days</b></div><p>The recommendation makes recent user-raised management concerns available to the same Q&A that retrieves current structured RAID information.</p>{!evaluated ? <button className="ab-primary" onClick={evaluate}>Evaluate Feedback <span>→</span></button> : !chatHistoryAdded ? <><div className="evaluation-complete">✓ Evaluation complete · Human review required before applying a Draft change.</div><button className="ab-primary" onClick={applyDraft}>Apply to Draft <span>→</span></button></> : <><div className="draft-applied">✓ Draft updated: Chat History · Last 7 Days</div><button className="ab-primary" onClick={retest}>Return to Agent Testers · Retest <span>→</span></button></>}</section> : <section className="recommendation"><span className="ab-kicker">USER FEEDBACK</span><h2>Captured for the shared lifecycle</h2><p>This local user Feedback record retains its interaction evidence. Evaluation has intentionally not been started in this prototype task.</p><div className="recommendation-row"><span>Created</span><b>{new Date(selectedRecord.createdTime).toLocaleString()}</b></div><div className="recommendation-row"><span>Data Objects</span><b>{selectedRecord.evidence.dataObjects.join(' · ') || 'None recorded'}</b></div></section>}</div>}<aside className="human-control"><b>Human control remains required.</b><p>Feedback records retain evidence and status locally. They cannot directly rewrite Agent Builder configuration.</p>{chatHistoryAdded && <button className="ab-secondary" onClick={openBuilder}>Inspect RAID Analysis Draft <span>→</span></button>}</aside></section>
}
