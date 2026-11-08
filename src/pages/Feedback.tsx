import { useEffect, useRef, useState } from "react";
import { caseTypeLabel, giverKindLabel, scenarioLabel } from "../constants";
import { formatDate, uid } from "../ids";
import { useApp } from "../store";
import type { FeedbackMode, ItemMark } from "../types";

type Tab = FeedbackMode;

export function FeedbackPage() {
  const { state, dispatch, toast, rememberAudio, sessionAudio } = useApp();
  const giver = state.people.find((person) => person.id === state.activePersonId);
  const cases = state.cases.filter((item) => item.status !== "draft" || state.activeRole !== "student");
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const developed = state.cases.find((item) => item.id === caseId) ?? null;
  const students = state.people.filter(
    (person) => person.roles.includes("student") && developed?.assignedCohorts.includes(person.cohort),
  );
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("speech");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [attachmentName, setAttachmentName] = useState<string | undefined>();
  const [localAudio, setLocalAudio] = useState<string | undefined>();
  const [narrativeTitle, setNarrativeTitle] = useState<string | undefined>();
  const [marks, setMarks] = useState<Record<string, ItemMark["mark"] | "">>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const keepListeningRef = useRef(false);
  const interimRef = useRef("");
  const sessionRef = useRef(0);
  const micGateRef = useRef<"idle" | "requesting" | "granted" | "denied">("idle");
  const [micGate, setMicGate] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  useEffect(() => {
    if (!students.some((person) => person.id === studentId)) setStudentId(students[0]?.id ?? "");
  }, [students, studentId]);

  useEffect(() => {
    const narrativeId = state.focus.narrativeId;
    if (!narrativeId) return;
    const blueprint = state.blueprints.find((bp) => bp.narratives.some((narrative) => narrative.id === narrativeId));
    const narrative = blueprint?.narratives.find((item) => item.id === narrativeId);
    if (!narrative) return;
    setTranscript(narrative.body);
    setNarrativeTitle(narrative.title);
    setTab("revised_narrative");
    const linked = state.cases.find((item) => item.blueprintId === blueprint?.id && item.status !== "draft");
    if (linked) setCaseId(linked.id);
  }, [state.focus.narrativeId, state.blueprints, state.cases]);

  useEffect(() => {
    return () => {
      keepListeningRef.current = false;
      recognitionRef.current?.stop();
      recorderRef.current?.stop();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  function rememberInterim(text: string) {
    interimRef.current = text;
    setInterim(text);
  }

  function updateMicGate(value: "idle" | "requesting" | "granted" | "denied") {
    micGateRef.current = value;
    setMicGate(value);
  }

  function speechEngine(session: number) {
    const Ctor = window.webkitSpeechRecognition ?? window.SpeechRecognition;
    if (!Ctor) return null;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => {
      if (session !== sessionRef.current) return;
      updateMicGate("granted");
      setListening(true);
      setNotice("Listening. Speak, and the words will appear in the transcript.");
    };
    recognition.onresult = (event) => {
      let finalText = "";
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece;
        else pending += piece;
      }
      if (finalText.trim()) {
        setTranscript((current) => `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}${finalText.trim()} `.replace(/\s+/g, " "));
      }
      rememberInterim(pending);
    };
    recognition.onerror = (event) => {
      if (session !== sessionRef.current || !keepListeningRef.current) return;
      if (event.error === "no-speech" || event.error === "aborted" || event.error === "network" || event.error === "audio-capture") return;
      if (event.error === "not-allowed") {
        keepListeningRef.current = false;
        setListening(false);
        updateMicGate("denied");
        setNotice("Microphone access was blocked. Choose Allow on the browser prompt. If you already blocked it, open the lock icon in the address bar, set Microphone to Allow, and start again.");
      }
    };
    recognition.onend = () => {
      if (session !== sessionRef.current || !keepListeningRef.current) {
        if (session === sessionRef.current) setListening(false);
        return;
      }
      window.setTimeout(() => {
        if (session !== sessionRef.current || !keepListeningRef.current) return;
        try {
          recognition.start();
        } catch {
          /* The recognizer is already running. */
        }
      }, 250);
    };
    return recognition;
  }

  async function allowMicrophone() {
    updateMicGate("requesting");
    setNotice("Your browser is asking to use the microphone. Choose Allow.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      updateMicGate("granted");
      return stream;
    } catch (error) {
      updateMicGate("denied");
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setNotice("Microphone access was blocked. Choose Allow on the browser prompt. If you already blocked it, open the lock icon in the address bar, set Microphone to Allow, and try again.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setNotice("No microphone was found. Connect one, then start again and choose Allow.");
      } else {
        setNotice("The microphone could not be opened. Start again and choose Allow when the browser asks.");
      }
      return null;
    }
  }

  function startDictation() {
    const Ctor = window.webkitSpeechRecognition ?? window.SpeechRecognition;
    if (!Ctor) {
      setNotice("This browser cannot turn speech into text. Record after choosing Allow, or type the transcript.");
      return;
    }

    sessionRef.current += 1;
    const session = sessionRef.current;
    keepListeningRef.current = true;
    setListening(true);
    updateMicGate("requesting");
    setNotice("Choose Allow on the browser prompt. Dictation keeps listening after you allow it.");

    const recognition = speechEngine(session);
    if (!recognition) return;
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      keepListeningRef.current = false;
      setListening(false);
      updateMicGate("denied");
      setNotice("Dictation could not open the microphone prompt. Use the lock icon in the address bar, set Microphone to Allow, and try again.");
    }
  }

  function stopDictation() {
    keepListeningRef.current = false;
    const tail = interimRef.current.trim();
    if (tail) {
      setTranscript((current) => `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}${tail}`.replace(/\s+/g, " "));
    }
    rememberInterim("");
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function startRecording() {
    setNotice("");
    setSeconds(0);
    const stream = await allowMicrophone();
    if (!stream) return;
    try {
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setLocalAudio(url);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
      sessionRef.current += 1;
      const recognition = speechEngine(sessionRef.current);
      if (recognition) {
        keepListeningRef.current = true;
        recognitionRef.current = recognition;
        recognition.start();
        setListening(true);
        setNotice("Microphone allowed. Recording, and writing the transcript as you speak.");
      } else {
        setNotice("Microphone allowed. This browser can record, but it cannot turn the recording into text. Type the transcript so the student still receives a synthesis.");
      }
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setMicGate("idle");
      setNotice("The microphone was allowed, but recording could not start. Try again.");
    }
  }

  function stopRecording() {
    keepListeningRef.current = false;
    const tail = interimRef.current.trim();
    if (tail) {
      setTranscript((current) => `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}${tail}`.replace(/\s+/g, " "));
    }
    rememberInterim("");
    recorderRef.current?.stop();
    recognitionRef.current?.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRecording(false);
    setListening(false);
  }

  async function onFile(file: File) {
    setAttachmentName(file.name);
    setNotice("");
    if (file.type.startsWith("audio/") || /\.(mp3|wav|m4a|webm|ogg)$/i.test(file.name)) {
      const url = URL.createObjectURL(file);
      setLocalAudio(url);
      setNotice("Audio file attached for this session. Automatic transcription of an uploaded recording needs a speech service, which is not connected. Dictate, or type the transcript, to include it in the synthesis.");
      return;
    }
    const text = await file.text();
    if (text.includes("\u0000")) {
      setNotice("That file is not plain text. Upload a .txt or .md file, or paste the feedback.");
      return;
    }
    setTranscript(text.slice(0, 20000));
    setNotice(`Read ${file.name} into the transcript.`);
  }

  function submit() {
    if (!developed || !studentId || !giver) {
      setError("Choose a case and a student.");
      return;
    }
    const text = `${transcript} ${interim}`.trim();
    const markList: ItemMark[] = [];
    for (const domain of developed.domains) {
      for (const skill of domain.skills) {
        for (const item of skill.items) {
          const mark = marks[item.id];
          if (!mark) continue;
          markList.push({
            itemId: item.id,
            itemText: item.text,
            skillName: skill.name,
            domainName: domain.name,
            mark,
          });
        }
      }
    }
    if (!text && markList.length === 0) {
      setError("Add a transcript or mark at least one checklist item.");
      return;
    }
    const id = uid("fb");
    if (localAudio) rememberAudio(id, localAudio);
    dispatch({
      type: "add-feedback",
      entry: {
        id,
        caseId: developed.id,
        studentId,
        giverId: giver.id,
        mode: tab,
        transcript: text,
        attachmentName,
        narrativeTitle: tab === "revised_narrative" ? narrativeTitle : undefined,
        marks: markList,
        createdAt: new Date().toISOString(),
      },
    });
    setTranscript("");
    setInterim("");
    setMarks({});
    setAttachmentName(undefined);
    setLocalAudio(undefined);
    setError("");
    toast("Feedback saved. The student’s synthesis now includes this transcript.");
  }

  const student = state.people.find((person) => person.id === studentId);
  const synthesis = state.syntheses.find((item) => item.caseId === caseId && item.studentId === studentId);
  const prior = state.feedback.filter((entry) => entry.caseId === caseId && entry.studentId === studentId);

  const speechSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const recordingSupported = typeof window !== "undefined" && typeof MediaRecorder !== "undefined";

  return (
    <div className="stack feedback-page">
      <div className="toolbar wrap">
        <label className="inline-field">
          <span>Case</span>
          <select
            value={caseId}
            onChange={(event) => {
              setCaseId(event.target.value);
              setMarks({});
            }}
          >
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Student</span>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {students.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · Class of {person.cohort}
              </option>
            ))}
          </select>
        </label>
        <p className="toolbar-note">
          Giving feedback as {giver?.name}
          {giver?.giverKinds[0] ? ` · ${giverKindLabel(giver.giverKinds[0])}` : ""}.
        </p>
      </div>

      {!developed || students.length === 0 ? (
        <p>No assigned case is available for this view. Activate a case and assign a class first.</p>
      ) : (
        <div className="feedback-layout">
          <section className="panel">
            <header className="panel-head">
              <div>
                <h2>{developed.title}</h2>
                <p>
                  {scenarioLabel(developed.scenario)} · {caseTypeLabel(developed.caseType)}. {developed.stem}
                </p>
              </div>
            </header>
            <div className="chips format-picker" role="tablist" aria-label="Feedback format">
              <TabButton id="speech" current={tab} onClick={setTab} label="Dictate" />
              <TabButton id="upload" current={tab} onClick={setTab} label="Upload" />
              <TabButton id="recording" current={tab} onClick={setTab} label="Record" />
              <TabButton id="revised_narrative" current={tab} onClick={setTab} label="Revise a sample" />
            </div>

            {tab === "speech" ? (
              <div className="stack tight">
                <div className="row-actions">
                  {listening && tab === "speech" ? (
                    <button type="button" className="btn danger" onClick={stopDictation}>
                      Stop dictation
                    </button>
                  ) : (
                    <button type="button" className="btn primary" onClick={() => void startDictation()} disabled={micGate === "requesting"}>
                      {micGate === "requesting" ? "Waiting for Allow…" : "Start dictation"}
                    </button>
                  )}
                  {listening ? <span className="live-dot">Listening</span> : null}
                </div>
                {micGate === "requesting" ? <p className="callout">Allow microphone access in the browser prompt.</p> : null}
                {micGate === "denied" ? <p className="callout">Microphone access is blocked. Allow it in the browser prompt or the address-bar lock icon, then start again.</p> : null}
                <p className="quiet">
                  {speechSupported
                    ? "Start dictation asks the browser for microphone access first. Choose Allow, then speak. The words appear in the transcript."
                    : "This browser cannot turn speech into text. You can still allow the microphone and record, or type the transcript."}
                </p>
              </div>
            ) : null}

            {tab === "upload" ? (
              <div className="stack tight">
                <label className="btn ghost file-btn">
                  Choose a file
                  <input
                    type="file"
                    accept=".txt,.md,text/plain,audio/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void onFile(file);
                    }}
                  />
                </label>
                {attachmentName ? <p className="quiet">Attached: {attachmentName}</p> : null}
              </div>
            ) : null}

            {tab === "recording" ? (
              <div className="stack tight">
                <div className="row-actions">
                  {recordingSupported ? (
                    recording ? (
                      <button type="button" className="btn danger" onClick={stopRecording}>
                        Stop recording ({formatClock(seconds)})
                      </button>
                    ) : (
                    <button type="button" className="btn primary" onClick={() => void startRecording()} disabled={micGate === "requesting"}>
                      {micGate === "requesting" ? "Waiting for Allow…" : "Record feedback"}
                    </button>
                    )
                  ) : null}
                  <label className="btn ghost file-btn">
                    Use the phone recorder
                    <input
                      type="file"
                      accept="audio/*"
                      capture="user"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void onFile(file);
                      }}
                    />
                  </label>
                </div>
                {micGate === "requesting" ? <p className="callout">Allow microphone access in the browser prompt.</p> : null}
                <p className="quiet">
                  Recording asks for microphone access first. Choose Allow. You can also use the phone’s own recorder.
                </p>
              </div>
            ) : null}

            {tab === "revised_narrative" ? (
              <NarrativePicker
                onPick={(title, body) => {
                  setNarrativeTitle(title);
                  setTranscript(body);
                }}
              />
            ) : null}

            <label className="field">
              <span>Transcript</span>
              <textarea
                rows={8}
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="Dictation, uploaded text, or a revised sample narrative appears here."
              />
            </label>
            {interim ? <p className="interim">{interim}</p> : null}
            {localAudio ? <audio controls playsInline src={localAudio} /> : null}
            {notice ? <p className="quiet">{notice}</p> : null}
          </section>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h2>Checklist</h2>
                <p>Optional. Marks are combined with the transcript when the synthesis is written for {student?.name ?? "the student"}.</p>
              </div>
            </header>
            {developed.domains.map((domain) => (
              <div key={domain.id} className="case-domain">
                <h3>{domain.name}</h3>
                {domain.skills.map((skill) => (
                  <div key={skill.id}>
                    <strong>{skill.name}</strong>
                    <ul className="mark-list">
                      {skill.items.map((item) => (
                        <li key={item.id}>
                          <span>
                            {item.critical ? <em>Critical. </em> : null}
                            {item.text}
                          </span>
                          <select
                            aria-label={`Mark for ${item.text}`}
                            value={marks[item.id] ?? ""}
                            onChange={(event) =>
                              setMarks((current) => ({
                                ...current,
                                [item.id]: event.target.value as ItemMark["mark"] | "",
                              }))
                            }
                          >
                            <option value="">Not marked</option>
                            <option value="met">Met</option>
                            <option value="not_met">Not met</option>
                            <option value="not_observed">Not observed</option>
                          </select>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
            {prior.length > 0 ? (
              <>
                <h3 className="subhead">Already submitted for this student</h3>
                <ul className="plain-list">
                  {prior.map((entry) => (
                    <li key={entry.id}>
                      {formatDate(entry.createdAt)} · {entry.mode.replaceAll("_", " ")}
                      {sessionAudio[entry.id] ? " · audio in this session" : ""}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {synthesis ? (
              <div className="synthesis">
                <h3>Current synthesis</h3>
                <p>{synthesis.narrative}</p>
              </div>
            ) : null}
          </section>
        </div>
      )}
      <div className="submit-bar">
        {error ? <p className="form-error">{error}</p> : <span className="quiet">The transcript is saved and synthesized for the student.</span>}
        <button type="button" className="btn primary" onClick={submit} disabled={!developed || students.length === 0}>
          Submit feedback
        </button>
      </div>
    </div>
  );
}

function TabButton({ id, current, onClick, label }: { id: Tab; current: Tab; onClick: (id: Tab) => void; label: string }) {
  return (
    <button type="button" role="tab" aria-selected={current === id} className={current === id ? "chip on" : "chip"} onClick={() => onClick(id)}>
      {label}
    </button>
  );
}

function NarrativePicker({ onPick }: { onPick: (title: string, body: string) => void }) {
  const { state } = useApp();
  const options = state.blueprints.flatMap((bp) => bp.narratives.map((narrative) => ({ bp, narrative })));
  const [id, setId] = useState(state.focus.narrativeId ?? options[0]?.narrative.id ?? "");
  return (
    <div className="stack tight">
      <label className="inline-field">
        <span>Sample narrative</span>
        <select
          value={id}
          onChange={(event) => {
            const next = event.target.value;
            setId(next);
            const found = options.find((option) => option.narrative.id === next);
            if (found) onPick(found.narrative.title, found.narrative.body);
          }}
        >
          {options.map((option) => (
            <option key={option.narrative.id} value={option.narrative.id}>
              {option.narrative.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn ghost"
        onClick={() => {
          const found = options.find((option) => option.narrative.id === id);
          if (found) onPick(found.narrative.title, found.narrative.body);
        }}
      >
        Load this narrative to revise
      </button>
    </div>
  );
}

function formatClock(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
