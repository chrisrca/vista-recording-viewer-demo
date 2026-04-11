import { useEffect, useRef, useState } from "react";
import { sessions } from "./data";
import "./App.css";
import vistaLogo from "./assets/vista.svg";

export default function App() {
  const [activeSession, setActiveSession] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, idx: null });
  const videoRef = useRef(null);
  const scrubberRef = useRef(null);
  const hoverTimer = useRef(null);
  const listRefs = useRef([]);

  const session = sessions[activeSession];
  const events = session.events;

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
                {duration > 0 && events.map((ev, i) => {
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
                {tooltip.visible && tooltip.idx !== null && (
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
          <div className="panel-header">
            <span className="panel-title">Navigation Events</span>
            <span className="panel-meta">{events.length} events</span>
          </div>
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
        </div>
      </div>
    </div>
  );
}