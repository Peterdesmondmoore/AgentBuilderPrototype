import { useEffect, useMemo, useState } from 'react'

type Page = 'Overview' | 'Builder' | 'Agent Testers' | 'Feedback'
type RunState = 'idle' | 'issues' | 'passed'

const bridgeVersion = 2
const prototypeKey = 'agent-builder-self-improvement'
const pageList: Page[] = ['Overview', 'Builder', 'Agent Testers', 'Feedback']

const personas = [
  { name: 'Delivery Manager', role: 'Delivery coordination', summary: 'Concise, evidence-led delivery decisions and escalation.', state: 'Active' },
  { name: 'Executive Sponsor', role: 'Strategic oversight', summary: 'Strategic information without operational detail.', state: 'Active' },
  { name: 'Product Manager', role: 'Product planning', summary: 'Demand, release and dependency visibility.', state: 'Active' },
  { name: 'New Mission Owner', role: 'New to Mission Surface', summary: 'Learns terminology while pursuing a business outcome.', state: 'Draft' },
]

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
  const [page, setPage] = useState<Page>('Overview')
  const [personaOpen, setPersonaOpen] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState('Delivery Manager')
  const [runState, setRunState] = useState<RunState>('idle')
  const [testPackRun, setTestPackRun] = useState(false)
  const [feedbackCreated, setFeedbackCreated] = useState(false)
  const [evaluated, setEvaluated] = useState(false)
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
  const runTest = () => setRunState(chatHistoryAdded ? 'passed' : 'issues')
  const createFeedback = () => { setFeedbackCreated(true); setPage('Feedback') }
  const applyDraft = () => { setChatHistoryAdded(true); setEvaluated(true) }
  const transcript = runState === 'passed' ? transcriptPassed : transcriptWithIssue

  return <div className="ab-app">
    <header className="ab-topbar">
      <button className="ab-brand" onClick={() => setPage('Overview')} aria-label="Agent Builder overview"><span>AB</span><div><strong>Agent Builder</strong><small>Experience prototype</small></div></button>
      <nav aria-label="Agent Builder primary navigation">
        {pageList.map((item) => <button key={item} className={page === item ? 'active' : ''} onClick={() => setPage(item)}>{item}{item === 'Agent Testers' && <em>Coming soon</em>}</button>)}
      </nav>
      <div className="ab-status"><span className="fixture-dot" /> Simulated fixture <button aria-label="Fixture profile">PD</button></div>
    </header>

    <main className="ab-main">
      {page === 'Overview' && <Overview goTo={setPage} />}
      {page === 'Builder' && <Builder chatHistoryAdded={chatHistoryAdded} finding={builderFinding} goTesters={() => setPage('Agent Testers')} />}
      {page === 'Agent Testers' && <Testers
        selectedPersona={selectedPersona} setSelectedPersona={setSelectedPersona} personaOpen={personaOpen} setPersonaOpen={setPersonaOpen}
        runState={runState} runTest={runTest} testPackRun={testPackRun} setTestPackRun={setTestPackRun}
        transcript={transcript} feedbackCreated={feedbackCreated} createFeedback={createFeedback} openBuilder={openBuilder} chatHistoryAdded={chatHistoryAdded} openHistory={setRunState}
      />}
      {page === 'Feedback' && <Feedback feedbackCreated={feedbackCreated} evaluated={evaluated} chatHistoryAdded={chatHistoryAdded} evaluate={() => setEvaluated(true)} applyDraft={applyDraft} retest={() => { setPage('Agent Testers'); setRunState('passed') }} openBuilder={openBuilder} />}
    </main>
    <footer className="ab-disclosure">Simulated experience · Fixture-only data · Tester behavior is deterministic · No model calls or configuration changes occur outside this local prototype.</footer>
  </div>
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

function Feedback({ feedbackCreated, evaluated, chatHistoryAdded, evaluate, applyDraft, retest, openBuilder }: { feedbackCreated: boolean; evaluated: boolean; chatHistoryAdded: boolean; evaluate: () => void; applyDraft: () => void; retest: () => void; openBuilder: () => void }) { return <section className="ab-feedback-page"><div className="ab-page-heading"><div><span className="ab-kicker">LAYER 4 · UNIFIED IMPROVEMENT LOOP</span><h1>Feedback</h1><p>Observed user feedback and Agent Tester findings share one evidence-led evaluation lifecycle.</p></div></div><div className="feedback-flow"><div><b>Real User</b><span>Interaction → User Feedback → Evaluation → Recommendation</span></div><div className="synthetic"><b>Agent Tester</b><span>Synthetic Interaction → Test Finding → Feedback → Evaluation → Recommendation</span></div></div>{!feedbackCreated ? <div className="feedback-empty"><h2>No feedback selected</h2><p>Create feedback from an Agent Tester Finding to start the shared evaluation flow.</p><button className="ab-primary" onClick={openBuilder}>Open Builder <span>→</span></button></div> : <div className="feedback-workspace"><section className="feedback-record"><div className="source-badge">SOURCE · AGENT TESTER</div><h2>RAID Analysis does not consider recent conversation context.</h2><p>Created from the Delivery Manager test: “Management attention check”. The source retains the test, persona, transcript, finding, route, target configuration, data objects and horizons.</p><div className="feedback-meta"><span>Persona <b>Delivery Manager</b></span><span>Route <b>RAID Analysis</b></span><span>Evidence <b>Transcript turn 5</b></span><span>Severity <b>High</b></span></div></section><section className="recommendation"><span className="ab-kicker">EVALUATION</span><h2>Targeted improvement recommendation</h2><div className="recommendation-row"><span>Target</span><b>RAID Analysis</b></div><div className="recommendation-row"><span>Add Data Object</span><b>Chat History</b></div><div className="recommendation-row"><span>Horizon</span><b>Last 7 Days</b></div><p>The recommendation makes recent user-raised management concerns available to the same Q&A that retrieves current structured RAID information.</p>{!evaluated ? <button className="ab-primary" onClick={evaluate}>Evaluate Feedback <span>→</span></button> : !chatHistoryAdded ? <><div className="evaluation-complete">✓ Evaluation complete · Human review required before applying a Draft change.</div><button className="ab-primary" onClick={applyDraft}>Apply to Draft <span>→</span></button></> : <><div className="draft-applied">✓ Draft updated: Chat History · Last 7 Days</div><button className="ab-primary" onClick={retest}>Return to Agent Testers · Retest <span>→</span></button></>}</section></div>}<aside className="human-control"><b>Human control remains required.</b><p>Agent Testers can create evidence and recommendations. They cannot directly rewrite Agent Builder configuration.</p>{chatHistoryAdded && <button className="ab-secondary" onClick={openBuilder}>Inspect RAID Analysis Draft <span>→</span></button>}</aside></section> }
