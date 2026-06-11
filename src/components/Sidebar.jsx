const quickTopics = [
  'Enrollment schedule',
  'Registrar documents',
  'Tuition balance',
  'Scholarship inquiry',
]

const campusSignals = [
  { label: 'Registrar', value: 'Online', tone: 'cyan' },
  { label: 'Admissions', value: 'Open', tone: 'lime' },
  { label: 'Queue', value: '12 waiting', tone: 'pink' },
]

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Chatbot navigation">
      <div className="brand-lockup">
        <div className="flame-mark" aria-hidden="true">
          <span className="flame flame-gold"></span>
          <span className="flame flame-red"></span>
          <span className="flame flame-purple"></span>
        </div>
        <div>
          <p className="eyebrow">MCU University</p>
          <h1>Campus Chatbot</h1>
        </div>
      </div>

      <section className="panel">
        <p className="panel-label">Quick Topics</p>
        <div className="topic-list">
          {quickTopics.map((topic) => (
            <button type="button" key={topic}>
              {topic}
            </button>
          ))}
        </div>
      </section>

      <section className="panel status-panel">
        <p className="panel-label">Live Campus Desk</p>
        {campusSignals.map((item) => (
          <div className="signal" key={item.label}>
            <span className={`dot ${item.tone}`}></span>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>
    </aside>
  )
}

export default Sidebar
