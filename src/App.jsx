import { useEffect, useRef, useState } from "react";
import { sessions } from "./data";
import "./App.css";
import vistaLogo from "./assets/vista.svg";

function buildAnswerTree(answers = []) {
  const units = {};
  for (const ans of answers) {
    const uKey = ans.unitName;
    const mKey = ans.moduleRoute;
    if (!units[uKey]) units[uKey] = { unitName: ans.unitName, modules: {} };
    if (!units[uKey].modules[mKey])
      units[uKey].modules[mKey] = { moduleName: ans.moduleName, moduleRoute: ans.moduleRoute, answers: [] };
    units[uKey].modules[mKey].answers.push(ans);
  }
  for (const u of Object.values(units))
    for (const m of Object.values(u.modules))
      m.answers.sort((a, b) => a.questionIndex - b.questionIndex);
  return Object.values(units);
}

export default function App() {
  const [activeSession, setActiveSession] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, idx: null });
  const [rightTab, setRightTab] = useState("answers");
  const [expandedUnits, setExpandedUnits] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
  const videoRef = useRef(null);
  const scrubberRef = useRef(null);
  const hoverTimer = useRef(null);
  const listRefs = useRef([]);

  const session = sessions[activeSession];
  const events = session.events;
  const answerTree = buildAnswerTree(session.answers);

  useEffect(() => {
    const eu = {};
    const em = {};
    for (const u of answerTree) {
      eu[u.unitName] = true;
      for (const m of Object.values(u.modules)) em[m.moduleRoute] = true;
    }
    setExpandedUnits(eu);
    setExpandedModules(em);
  }, [activeSession]);

  function formatRecordingDate(unixMs) {
    return new Date(Number(unixMs)).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
    setActiveIdx(null);
  }, [activeSession]);

  useEffect(() => {
    if (!duration) return;
    let idx = null;
    for (let i = 0; i < events.length; i++) {
      if (currentTime >= events[i].t) idx = i;
    }
    setActiveIdx(idx);
  }, [currentTime, duration, events]);

  useEffect(() => {
    if (activeIdx !== null && listRefs.current[activeIdx]) {
      listRefs.current[activeIdx].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIdx]);

  function handleTimeUpdate() {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }
  function handleLoadedMetadata() {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }
  function handleScrubClick(e) {
    if (!scrubberRef.current || !videoRef.current || !duration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = Math.max(0, Math.min(ratio * duration, duration));
  }
  function togglePlay() {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  }
  function jumpTo(t) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = t;
    videoRef.current.play();
  }
  function handleMarkerEnter(idx) {
    hoverTimer.current = setTimeout(() => {
      const pos = (events[idx].t / duration) * 100;
      setTooltip({ visible: true, x: pos, idx });
    }, 300);
  }
  function handleMarkerLeave() {
    clearTimeout(hoverTimer.current);
    setTooltip({ visible: false, x: 0, idx: null });
  }
  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function toggleUnit(unitName) {
    setExpandedUnits(prev => ({ ...prev, [unitName]: !prev[unitName] }));
  }
  function toggleModule(moduleRoute) {
    setExpandedModules(prev => ({ ...prev, [moduleRoute]: !prev[moduleRoute] }));
  }

  function isActiveAnswer(ans) {
    return currentTime >= ans.navEnter && currentTime <= ans.navExit;
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <img src={vistaLogo} className="logo-img" alt="Vista" />
          <div className="header-divider" />
          <span className="header-title">Participant View</span>
        </div>
        <div className="header-right">
          <span className="header-study">mqp26-mocha</span>
        </div>
      </header>

      <div className="subnav">
        {sessions.map((s, i) => (
          <div
            key={i}
            className={`subnav-item ${activeSession === i ? "active" : ""}`}
            onClick={() => setActiveSession(i)}
            title={s.participantId}
          >
            <span className="tab-pid">{s.participantId}</span>
            <span className="tab-rid">{formatRecordingDate(s.recordingId)}</span>
          </div>
        ))}
      </div>

      <div className="layout">
        <div className="video-panel">
          <div className="panel-header">
            <span className="panel-title">{session.videoFile}</span>
            <span className="panel-meta">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <div className="video-wrap" onClick={togglePlay}>
            <video
              key={session.videoFile}
              ref={videoRef}
              src={session.videoFile}
              className="video-el"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            {!playing && (
              <div className="play-overlay">
                <div className="play-btn-big">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            )}
          </div>

          <div className="controls">
            <button className="ctrl-btn" onClick={togglePlay}>
              {playing
                ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
                : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <button className="ctrl-btn" onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; }}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
            </button>
            <span className="time-label">{formatTime(currentTime)}</span>
            <div className="scrubber-wrap">
              <div className="scrubber" ref={scrubberRef} onClick={handleScrubClick}>
                <div className="scrubber-bg" />
                <div className="scrubber-fill" style={{ width: `${progress}%` }} />
                <div className="scrubber-thumb" style={{ left: `${progress}%` }} />
                {duration > 0 && rightTab === "nav" && events.map((ev, i) => {
                  const pct = (ev.t / duration) * 100;
                  return (
                    <div
                      key={i}
                      className={`marker ${activeIdx === i ? "marker-active" : ""}`}
                      style={{ left: `${pct}%` }}
                      onClick={(e) => { e.stopPropagation(); jumpTo(ev.t); }}
                      onMouseEnter={() => handleMarkerEnter(i)}
                      onMouseLeave={handleMarkerLeave}
                    />
                  );
                })}
                {duration > 0 && rightTab === "answers" && (session.answers || []).map((ans, i) => {
                  const pct = (ans.navEnter / duration) * 100;
                  const correct = ans.selectedAnswerIndex === ans.correctAnswerIndex;
                  const active = isActiveAnswer(ans);
                  return (
                    <div
                      key={i}
                      className={`marker marker-answer ${correct ? "marker-correct" : "marker-incorrect"} ${active ? "marker-active" : ""}`}
                      style={{ left: `${pct}%` }}
                      onClick={(e) => { e.stopPropagation(); jumpTo(ans.navEnter); }}
                    />
                  );
                })}
                {tooltip.visible && tooltip.idx !== null && rightTab === "nav" && (
                  <div className="marker-tooltip" style={{ left: `clamp(40px, ${tooltip.x}%, calc(100% - 40px))` }}>
                    {events[tooltip.idx].screenId}
                  </div>
                )}
              </div>
            </div>
            <span className="time-label">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="nav-panel">
          <div className="right-tabs">
            <button
              className={`right-tab ${rightTab === "answers" ? "right-tab-active" : ""}`}
              onClick={() => setRightTab("answers")}
            >
              Answers
              <span className="right-tab-count">{(session.answers || []).length}</span>
            </button>
            <button
              className={`right-tab ${rightTab === "nav" ? "right-tab-active" : ""}`}
              onClick={() => setRightTab("nav")}
            >
              Navigation
              <span className="right-tab-count">{events.length}</span>
            </button>
          </div>

          {rightTab === "nav" && (
            <div className="nav-table">
              <div className="nav-table-head">
                <span>Screen</span>
                <span>Time</span>
                <span></span>
              </div>
              <div className="nav-table-body">
                {events.map((ev, i) => (
                  <div
                    key={i}
                    ref={el => listRefs.current[i] = el}
                    className={`nav-row ${activeIdx === i ? "nav-row-active" : ""}`}
                    onClick={() => jumpTo(ev.t)}
                  >
                    <span className="nav-screen">{ev.screenId}</span>
                    <span className="nav-time">{formatTime(ev.t)}</span>
                    <span className="nav-jump">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rightTab === "answers" && (
            <div className="ans-tree">
              {answerTree.length === 0 && (
                <div className="ans-empty">No answer events recorded.</div>
              )}
              {answerTree.map(unit => (
                <div key={unit.unitName} className="ans-unit">
                  <div
                    className="ans-unit-header"
                    onClick={() => toggleUnit(unit.unitName)}
                  >
                    <span className={`ans-chevron ${expandedUnits[unit.unitName] ? "ans-chevron-open" : ""}`}>
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    </span>
                    <span className="ans-unit-name">{unit.unitName}</span>
                    <span className="ans-count">
                      {Object.values(unit.modules).reduce((s, m) => s + m.answers.length, 0)}
                    </span>
                  </div>

                  {expandedUnits[unit.unitName] && Object.values(unit.modules).map(mod => (
                    <div key={mod.moduleRoute} className="ans-module">
                      <div
                        className="ans-module-header"
                        onClick={() => toggleModule(mod.moduleRoute)}
                      >
                        <span className={`ans-chevron ${expandedModules[mod.moduleRoute] ? "ans-chevron-open" : ""}`}>
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                        </span>
                        <span className="ans-module-name">{mod.moduleName}</span>
                        <span className="ans-count">{mod.answers.length}</span>
                      </div>

                      {expandedModules[mod.moduleRoute] && mod.answers.map(ans => {
                        const correct = ans.selectedAnswerIndex === ans.correctAnswerIndex;
                        const active = isActiveAnswer(ans);
                        return (
                          <div
                            key={ans.id}
                            className={`ans-row ${active ? "ans-row-active" : ""}`}
                            onClick={() => jumpTo(ans.navEnter)}
                          >
                            <span className={`ans-result-dot ${correct ? "ans-correct" : "ans-incorrect"}`} title={correct ? "Correct" : "Incorrect"} />
                            <span className="ans-q-label">Q{ans.questionIndex + 1}</span>
                            <span className="ans-window">
                              {formatTime(ans.navEnter)}–{formatTime(ans.navExit)}
                            </span>
                            {ans.secondAttempt && <span className="ans-badge">2nd</span>}
                            <span className="nav-jump">
                              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}