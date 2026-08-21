import { useEffect, useMemo, useRef, useState } from 'react'

type Screen =
  | 'Start'
  | 'Download starter'
  | 'Connect GitHub'
  | 'Publish or capture'
  | 'Verify'
  | 'Review and comment'
  | 'Submit feedback'

type DeliveryMode = 'Live' | 'Images'

const bridgeVersion = 2

const pageOrder: Screen[] = [
  'Start',
  'Download starter',
  'Connect GitHub',
  'Publish or capture',
  'Verify',
  'Review and comment',
  'Submit feedback',
]

const journey: Array<{ page: Exclude<Screen, 'Start'>; number: string; title: string; summary: string }> = [
  { page: 'Download starter', number: '01', title: 'Download the starter', summary: 'Begin with the governed repository structure.' },
  { page: 'Connect GitHub', number: '02', title: 'Connect GitHub', summary: 'Give Mission Surface read-only catalogue access.' },
  { page: 'Publish or capture', number: '03', title: 'Publish or capture', summary: 'Enable Pages for live work, or prepare images locally.' },
  { page: 'Verify', number: '04', title: 'Verify the revision', summary: 'Check manifests, routes, artifacts, and limitations.' },
  { page: 'Review and comment', number: '05', title: 'Review and comment', summary: 'Walk the experience and leave contextual feedback.' },
  { page: 'Submit feedback', number: '06', title: 'Submit the request', summary: 'Send the review outcome to the Request dashboard.' },
]

const screenExplainers: Record<Screen, { title: string; description: string }> = {
  'Start': { title: 'Start with the complete path', description: 'Use this overview to understand the six setup and review steps before beginning the walkthrough.' },
  'Download starter': { title: 'Keep the governed structure', description: 'The starter provides the catalogue and validation contracts that make this prototype discoverable.' },
  'Connect GitHub': { title: 'Review the access boundary', description: 'Mission Surface reads only committed prototype content through its authorised GitHub integration.' },
  'Publish or capture': { title: 'Choose the delivery mode', description: 'Use GitHub Pages for live review or validated images for private review journeys.' },
  'Verify': { title: 'Verify the reviewer experience', description: 'Check the declared revision, routes, artifacts and limitations before inviting review.' },
  'Review and comment': { title: 'Review in context', description: 'Use the prototype journey and contextual feedback to evaluate the demonstrated experience.' },
  'Submit feedback': { title: 'Close the feedback loop', description: 'Return the review outcome to the prototype feedback workflow for product triage.' },
}

export default function App() {
  const screenRef = useRef<HTMLElement>(null)
  const [screen, setScreen] = useState<Screen>('Start')
  const [downloaded, setDownloaded] = useState(false)
  const [connected, setConnected] = useState(false)
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('Live')
  const [published, setPublished] = useState(false)
  const [verified, setVerified] = useState(false)
  const [commented, setCommented] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [dismissedExplainerScreen, setDismissedExplainerScreen] = useState<Screen | null>(null)

  const bridge = useMemo(() => {
    const query = new URLSearchParams(window.location.search)
    if (query.get('msProtocol') !== 'mission-surface-prototype' || query.get('msVersion') !== String(bridgeVersion) || query.get('msPrototype') !== 'mobile-sample' || !query.get('msChannel') || !query.get('msParentOrigin')) return null
    const parentOrigin = new URL(query.get('msParentOrigin') as string).origin
    if (parentOrigin !== 'https://missionsurface.com' && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(parentOrigin)) return null
    return { channel: query.get('msChannel'), parentOrigin }
  }, [])

  useEffect(() => {
    if (!bridge) return
    const postReady = () => window.parent.postMessage({ protocol: 'mission-surface-prototype', version: bridgeVersion, channel: bridge.channel, prototypeKey: 'mobile-sample', type: 'ready', page: screen }, bridge.parentOrigin)
    postReady()
    const retryTimers = [250, 1000].map((delay) => window.setTimeout(postReady, delay))
    return () => retryTimers.forEach(window.clearTimeout)
  }, [bridge])

  useEffect(() => {
    if (!bridge) return
    window.parent.postMessage({ protocol: 'mission-surface-prototype', version: bridgeVersion, channel: bridge.channel, prototypeKey: 'mobile-sample', type: 'page', page: screen }, bridge.parentOrigin)
  }, [bridge, screen])

  useEffect(() => {
    setDismissedExplainerScreen(null)
  }, [screen])

  useEffect(() => {
    if (!bridge) return
    const showCurrentExplainer = (event: MessageEvent) => {
      const payload = event.data as Record<string, unknown> | null
      if (
        event.origin !== bridge.parentOrigin
        || event.source !== window.parent
        || !payload
        || payload.protocol !== 'mission-surface-prototype'
        || payload.version !== bridgeVersion
        || payload.channel !== bridge.channel
        || payload.prototypeKey !== 'mobile-sample'
        || payload.type !== 'explain'
        || payload.page !== screen
      ) return
      setDismissedExplainerScreen(null)
    }
    window.addEventListener('message', showCurrentExplainer)
    return () => window.removeEventListener('message', showCurrentExplainer)
  }, [bridge, screen])

  useEffect(() => {
    if (!bridge) return
    const element = screenRef.current
    if (!element) return

    let animationFrame: number | null = null
    const postViewport = () => {
      animationFrame = null
      window.parent.postMessage({
        protocol: 'mission-surface-prototype',
        version: bridgeVersion,
        channel: bridge.channel,
        prototypeKey: 'mobile-sample',
        type: 'viewport',
        page: screen,
        scrollX: element.scrollLeft,
        scrollY: element.scrollTop,
        viewportWidth: element.clientWidth,
        viewportHeight: element.clientHeight,
        documentWidth: element.scrollWidth,
        documentHeight: element.scrollHeight,
      }, bridge.parentOrigin)
    }
    const scheduleViewport = () => {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(postViewport)
    }

    element.addEventListener('scroll', scheduleViewport, { passive: true })
    window.addEventListener('resize', scheduleViewport)
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleViewport)
    resizeObserver?.observe(element)
    Array.from(element.children).forEach((child) => resizeObserver?.observe(child))
    scheduleViewport()
    const retryTimers = [250, 1000].map((delay) => window.setTimeout(scheduleViewport, delay))

    return () => {
      element.removeEventListener('scroll', scheduleViewport)
      window.removeEventListener('resize', scheduleViewport)
      resizeObserver?.disconnect()
      retryTimers.forEach(window.clearTimeout)
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
    }
  }, [bridge, screen, downloaded, connected, deliveryMode, published, verified, commented, submitted])

  const completion = [downloaded, connected, published, verified, commented, submitted]
  const progress = Math.round((completion.filter(Boolean).length / completion.length) * 100)
  const goBack = () => setScreen(pageOrder[Math.max(0, pageOrder.indexOf(screen) - 1)])
  const completedFor = (index: number) => completion[index]

  return (
    <main className="stage">
      <div className="disclosure"><span className="disclosure-dot" /><strong>Mission Surface baseline sample</strong><span>Simulated &middot; No data is saved</span></div>
      <article className="phone-shell">
        <header className="app-header">
          <button className="brand" onClick={() => setScreen('Start')} aria-label="Go to start"><span>MS</span></button>
          <div className="brand-copy"><strong>Prototype setup</strong><span>Guided baseline</span></div>
          <span className="sample-pill">SAMPLE</span>
          <button className="avatar" aria-label="Fixture profile">PD</button>
        </header>

        <div className="screen-progress" aria-label={`Setup ${progress}% complete`}><span style={{ width: `${progress}%` }} /></div>

        <section className="screen" key={screen} ref={screenRef}>
          {screen !== 'Start' && <button className="text-button back-button" onClick={goBack}><span>&larr;</span> Back</button>}
          {dismissedExplainerScreen !== screen && (
            <aside className="screen-explainer" aria-label={`${screen} explainer`}>
              <div><span>SCREEN GUIDE</span><strong>{screenExplainers[screen].title}</strong><p>{screenExplainers[screen].description}</p></div>
              <button type="button" onClick={() => setDismissedExplainerScreen(screen)}>Got it</button>
            </aside>
          )}

          {screen === 'Start' && (
            <>
              <div className="hero">
                <div className="eyebrow"><span className="live-dot" /> SIX STEPS TO REVIEW</div>
                <h1>Set up a prototype for Mission Surface.</h1>
                <p>Move from the governed starter to a verified review, then return the outcome to the Request dashboard.</p>
                <button className="primary-button hero-button" onClick={() => setScreen('Download starter')}>Start the walkthrough <span>&rarr;</span></button>
                <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
              </div>

              <div className="metrics" aria-label="Prototype setup summary">
                <div><strong>6</strong><span>steps</span></div>
                <div><strong>{progress}%</strong><span>complete</span></div>
                <div><strong>~8</strong><span>minutes</span></div>
              </div>

              <div className="section-heading"><div><span>BASELINE PATH</span><h2>From starter to feedback</h2></div><span className="time-chip">HIGH LEVEL</span></div>
              <div className="journey-list">
                {journey.map((item, index) => (
                  <button className="journey-card" key={item.page} onClick={() => setScreen(item.page)}>
                    <span className={`step-number ${completedFor(index) ? 'complete' : index === completion.findIndex((item) => !item) ? 'current' : ''}`}>{completedFor(index) ? 'OK' : item.number}</span>
                    <span className="journey-copy"><strong>{item.title}</strong><small>{item.summary}</small></span>
                    <span className="card-arrow">&rarr;</span>
                  </button>
                ))}
              </div>
              <aside className="tip-card"><span className="tip-icon">i</span><div><strong>One setup path, two delivery modes</strong><p>Live prototypes use GitHub Pages. Image prototypes are captured and validated locally.</p></div></aside>
            </>
          )}

          {screen === 'Download starter' && (
            <>
              <StepHeading number="1" label="START" title="Download the governed starter." description="Use the starter so Mission Surface can discover the catalogue, child manifests, review pages, and limitations consistently." />
              <div className="asset-card">
                <span className="asset-icon">ZIP</span>
                <div><span>MISSION SURFACE</span><strong>Prototype starter</strong><small>React, TypeScript, Vite, schemas, and capture tools</small></div>
                <span className="version-pill">v2</span>
              </div>
              <div className="detail-list">
                <Detail icon="01" title="Keep the structure" copy="Register every prototype in the root catalogue." />
                <Detail icon="02" title="Use fixture content" copy="Never include customer, tenant, or production data." />
                <Detail icon="03" title="Declare limitations" copy="Make the simulated boundary visible to reviewers." />
              </div>
              {downloaded ? <StatusCard title="Starter ready" copy="The sample download is complete. No file was created in this simulation." /> : <button className="primary-button full-button" onClick={() => setDownloaded(true)}>Download starter <span>&darr;</span></button>}
              {downloaded && <button className="primary-button full-button" onClick={() => setScreen('Connect GitHub')}>Connect GitHub <span>&rarr;</span></button>}
            </>
          )}

          {screen === 'Connect GitHub' && (
            <>
              <StepHeading number="2" label="CONNECT" title="Connect the GitHub repository." description="Mission Surface reads the repository through a read-only GitHub App. It does not clone, build, deploy, or write to it." />
              <div className="repository-card">
                <span className="repo-mark">GH</span>
                <div><span>FIXTURE REPOSITORY</span><strong>team / prototype-workspace</strong><small>main &middot; private &middot; catalogue detected</small></div>
                <span className={`status-pill ${connected ? 'connected' : ''}`}>{connected ? 'Connected' : 'Ready'}</span>
              </div>
              <div className="permission-card">
                <span className="permission-icon">RO</span><div><strong>Read-only access</strong><p>Repository metadata and committed prototype files only.</p></div>
              </div>
              {connected ? <StatusCard title="Repository connected" copy="Two baseline samples were discovered from prototype.json." /> : <button className="primary-button full-button" onClick={() => setConnected(true)}>Connect repository <span>&rarr;</span></button>}
              {connected && <button className="primary-button full-button" onClick={() => setScreen('Publish or capture')}>Choose delivery <span>&rarr;</span></button>}
            </>
          )}

          {screen === 'Publish or capture' && (
            <>
              <StepHeading number="3" label="DELIVER" title="Publish live or prepare images." description="Choose the path declared by the prototype manifest. Both paths end with committed, verifiable review assets." />
              <div className="segmented-control" aria-label="Delivery mode">
                {(['Live', 'Images'] as DeliveryMode[]).map((mode) => <button key={mode} className={deliveryMode === mode ? 'selected' : ''} onClick={() => { setDeliveryMode(mode); setPublished(false) }}><span>{mode === 'Live' ? 'WEB' : 'PNG'}</span>{mode}</button>)}
              </div>
              {deliveryMode === 'Live' ? (
                <div className="mode-panel">
                  <div className="mode-heading"><span className="panel-icon cyan">GH</span><div><strong>Enable GitHub Pages</strong><small>Settings &rarr; Pages &rarr; GitHub Actions</small></div></div>
                  <ol><li>Push the validated live prototype.</li><li>Enable Pages for the repository.</li><li>Confirm the deployed revision metadata.</li></ol>
                </div>
              ) : (
                <div className="terminal-card">
                  <div className="terminal-top"><span><i /><i /><i /></span><small>PowerShell &middot; repository root</small></div>
                  <code><span>PS</span> .\prepare-images.ps1</code>
                  <p>Captures declared pages, validates the images, and builds the live-only public bundle.</p>
                </div>
              )}
              {published ? <StatusCard title={deliveryMode === 'Live' ? 'Pages enabled' : 'Images prepared'} copy={deliveryMode === 'Live' ? 'The fixture deployment is available for verification.' : 'The fixture screenshots passed local preparation.'} /> : <button className="primary-button full-button" onClick={() => setPublished(true)}>{deliveryMode === 'Live' ? 'Enable GitHub Pages' : 'Run image preparation'} <span>&rarr;</span></button>}
              {published && <button className="primary-button full-button" onClick={() => setScreen('Verify')}>Verify the revision <span>&rarr;</span></button>}
            </>
          )}

          {screen === 'Verify' && (
            <>
              <StepHeading number="4" label="VERIFY" title="Verify what reviewers will see." description="Check the exact revision before inviting review. A green build alone is not enough; the experience and disclosures must also be current." />
              <div className="verification-card">
                {['Catalogue and child manifests', 'Routes or screenshot mappings', 'Fidelity and limitations', 'Deployment revision'].map((label, index) => (
                  <div key={label}><span className={verified ? 'verify-icon passed' : 'verify-icon'}>{verified ? 'OK' : `0${index + 1}`}</span><div><strong>{label}</strong><small>{verified ? 'Verified against the fixture revision' : 'Waiting for verification'}</small></div></div>
                ))}
              </div>
              {verified ? <StatusCard title="Revision verified" copy="The fixture revision is ready for a focused Mission Surface review." /> : <button className="primary-button full-button" onClick={() => setVerified(true)}>Run verification <span>&rarr;</span></button>}
              {verified && <button className="primary-button full-button" onClick={() => setScreen('Review and comment')}>Open the review <span>&rarr;</span></button>}
            </>
          )}

          {screen === 'Review and comment' && (
            <>
              <StepHeading number="5" label="REVIEW" title="Review the journey and comment." description="Use the screen-local guidance, fullscreen, and contextual comments to evaluate the demonstrated experience." />
              <div className="review-preview">
                <div className="review-toolbar"><span>Mobile sample</span><div><b>Screen guide</b><b>Comment</b></div></div>
                <div className="review-canvas"><span className="mini-phone">MS</span><div className="explain-box"><strong>Is the next decision clear?</strong><small>Screen-local guidance is part of the prototype and can be dismissed for this visit.</small></div></div>
              </div>
              {commented && <div className="comment-card"><span>PD</span><div><strong>Fixture reviewer</strong><p>The setup path is clear. Verify the image handoff wording with the team.</p></div></div>}
              {commented ? <StatusCard title="Comment added" copy="This is a local fixture state; no feedback was sent." /> : <button className="primary-button full-button" onClick={() => setCommented(true)}>Add fixture comment <span>+</span></button>}
              {commented && <button className="primary-button full-button" onClick={() => setScreen('Submit feedback')}>Finish in Requests <span>&rarr;</span></button>}
            </>
          )}

          {screen === 'Submit feedback' && (
            <>
              <StepHeading number="6" label="CLOSE THE LOOP" title="Submit feedback to Requests." description="Return the review outcome to the Request dashboard so the product team can decide what happens next." />
              <div className="request-card">
                <div className="request-top"><span className="panel-icon violet">RQ</span><div><span>REQUEST DASHBOARD</span><strong>Prototype feedback</strong></div><span className="draft-pill">Draft</span></div>
                <div className="request-field"><span>OUTCOME</span><strong>Proceed with changes</strong></div>
                <div className="request-field"><span>SUMMARY</span><p>The setup journey is ready for the next product decision. One image-workflow wording change remains.</p></div>
                <div className="request-meta"><span>6 steps reviewed</span><span>1 comment linked</span></div>
              </div>
              <div className="privacy-note"><span>i</span><p>This baseline uses fixture feedback only. Nothing is submitted outside the simulation.</p></div>
              {submitted ? (
                <div className="finish-state"><span>OK</span><div><strong>Feedback submitted</strong><small>The simulated request is now ready for product triage.</small></div></div>
              ) : <button className="primary-button full-button" onClick={() => setSubmitted(true)}>Submit to Request dashboard <span>&rarr;</span></button>}
              {submitted && <button className="secondary-button" onClick={() => setScreen('Start')}>Return to the baseline path</button>}
            </>
          )}
        </section>

        <nav className="bottom-nav" aria-label="Prototype setup guide">
          <button className={screen === 'Start' ? 'active' : ''} onClick={() => setScreen('Start')}><span className="nav-icon">01</span><small>Start</small></button>
          <button className={['Download starter', 'Connect GitHub', 'Publish or capture', 'Verify'].includes(screen) ? 'active' : ''} onClick={() => setScreen('Download starter')}><span className="nav-icon">04</span><small>Setup</small></button>
          <button className={['Review and comment', 'Submit feedback'].includes(screen) ? 'active' : ''} onClick={() => setScreen('Review and comment')}><span className="nav-icon">06</span><small>Review</small></button>
        </nav>
      </article>
    </main>
  )
}

function StepHeading({ number, label, title, description }: { number: string; label: string; title: string; description: string }) {
  return <><div className="step-kicker"><span>STEP {number} OF 6</span><span>{label}</span></div><h1>{title}</h1><p className="lead">{description}</p></>
}

function Detail({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return <div><span className="detail-icon">{icon}</span><div><strong>{title}</strong><small>{copy}</small></div></div>
}

function StatusCard({ title, copy }: { title: string; copy: string }) {
  return <div className="status-card" role="status"><span>OK</span><div><strong>{title}</strong><small>{copy}</small></div></div>
}
