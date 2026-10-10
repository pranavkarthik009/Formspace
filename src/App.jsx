import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileBox,
  FileUp,
  Link2,
  LoaderCircle,
  Move3D,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Upload,
  X,
} from "lucide-react";

const ACCEPTED_FORMATS = [".glb", ".gltf", ".stl", ".obj", ".fbx"];
const MAX_FILE_SIZE = 100 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getShareUrl(id) {
  return `${window.location.origin}/model/${id}`;
}

function Landing({ onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [units, setUnits] = useState("mm");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function chooseFile(candidate) {
    if (!candidate) return;
    const extension = `.${candidate.name.split(".").pop()?.toLowerCase()}`;
    if (!ACCEPTED_FORMATS.includes(extension)) {
      setError(`That format isn't supported yet. Choose ${ACCEPTED_FORMATS.join(", ")}.`);
      setFile(null);
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError("The maximum file size is 100 MB.");
      setFile(null);
      return;
    }
    setError("");
    setFile(candidate);
    if ([".glb", ".gltf"].includes(extension)) setUnits("m");
    else setUnits("mm");
  }

  async function uploadModel() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      const { convertToGlb } = await import("./convertToGlb.js");
      const modelFile = await convertToGlb(file, units);
      formData.append("originalName", file.name);
      formData.append("units", units);
      formData.append("file", modelFile);
      const response = await fetch("/api/models", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed. Please try again.");
      onUploaded(result.id);
    } catch (uploadError) {
      setError(uploadError.message || "Couldn't reach the server. Check that it is running.");
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR MODELS, OUT IN THE WORLD</div>
          <h1>From screen<br />to <span>somewhere.</span></h1>
          <p className="hero-lead">
            Upload a 3D model. Get a link. Let anyone see it in their own space — no app download needed.
          </p>
          <div className="hero-points">
            <span><Check size={15} /> Works on iPhone & Android</span>
            <span><Check size={15} /> Share with a link or QR</span>
          </div>
        </div>

        <div className="upload-card">
          <div className="card-heading">
            <div>
              <p className="card-kicker">START WITH A MODEL</p>
              <h2>Make it real</h2>
            </div>
            <div className="upload-icon"><FileUp size={21} /></div>
          </div>

          <button
            className={`dropzone${dragging ? " is-dragging" : ""}${file ? " has-file" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              chooseFile(event.dataTransfer.files?.[0]);
            }}
            type="button"
          >
            {file ? (
              <>
                <div className="file-icon"><Box size={24} /></div>
                <span className="drop-title">{file.name}</span>
                <span className="drop-caption">{formatBytes(file.size)} · Ready to upload</span>
              </>
            ) : (
              <>
                <div className="drop-icon"><Upload size={21} /></div>
                <span className="drop-title">Drop your 3D file here</span>
                <span className="drop-caption">or <span className="browse-link">browse files</span></span>
              </>
            )}
          </button>
          <input
            accept={ACCEPTED_FORMATS.join(",")}
            className="visually-hidden"
            onChange={(event) => chooseFile(event.target.files?.[0])}
            ref={inputRef}
            type="file"
          />

          <div className="format-row">
            <span>SUPPORTED FORMATS</span>
            <div className="format-tags">
              {["GLB", "GLTF", "STL", "OBJ", "FBX"].map((format) => <span key={format}>{format}</span>)}
            </div>
          </div>

          <label className="unit-row">
            <span>Source units <span className="muted">({file && [".glb", ".gltf"].includes(`.${file.name.split(".").pop()?.toLowerCase()}`) ? "GLB/glTF use meters" : "for real-world scale"})</span></span>
            <select
              disabled={file && [".glb", ".gltf"].includes(`.${file.name.split(".").pop()?.toLowerCase()}`)}
              onChange={(event) => setUnits(event.target.value)}
              value={units}
            >
              <option value="mm">Millimeters</option>
              <option value="cm">Centimeters</option>
              <option value="m">Meters</option>
            </select>
          </label>

          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="primary-button upload-button" disabled={!file || busy} onClick={uploadModel}>
            {busy ? <><LoaderCircle className="spin" size={18} /> Preparing your model…</> : <>Upload & create link <ChevronRight size={17} /></>}
          </button>
          <p className="privacy-note"><ShieldCheck size={14} /> Your model is only shared with people who have its link.</p>
        </div>
      </section>

      <section className="steps-section">
        <div className="section-heading">
          <span className="section-label">THREE STEPS. ONE NEW PERSPECTIVE.</span>
          <h2>Reality is one scan away.</h2>
        </div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-top"><span>01</span><FileBox size={20} /></div>
            <h3>Bring your model</h3>
            <p>Drop in a 3D file. We’ll get it ready to view and place.</p>
          </div>
          <div className="step-card">
            <div className="step-top"><span>02</span><Link2 size={20} /></div>
            <h3>Share anywhere</h3>
            <p>Get a unique link and QR code to send to anyone.</p>
          </div>
          <div className="step-card">
            <div className="step-top"><span>03</span><ScanLine size={20} /></div>
            <h3>See it in your space</h3>
            <p>Open on a phone, tap View in AR, and find the perfect spot.</p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand" href="/"><span className="brand-mark"><Move3D size={17} /></span> formspace</a>
        <span>Made for things that haven’t been made yet.</span>
      </footer>
    </main>
  );
}

function SharedModel({ id }) {
  const [model, setModel] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);
  const shareUrl = getShareUrl(id);

  useEffect(() => {
    import("@google/model-viewer").catch(() => {
      setError("The 3D viewer couldn't load. Please refresh and try again.");
    });
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/models/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "This model link is unavailable.");
        if (active) setModel(data);
      })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [id]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy the link. Please copy it from the address bar.");
    }
  }

  function downloadQr() {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${model.name.replace(/[^a-z0-9-_]+/gi, "-")}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (error) {
    return <main className="state-page"><a className="back-link" href="/"><ChevronLeft size={16} /> Back to Formspace</a><div className="state-card"><div className="state-symbol"><X size={22} /></div><h1>We couldn't find that model.</h1><p>{error}</p><a className="primary-button" href="/">Upload a model</a></div></main>;
  }

  if (!model) return <main className="state-page"><div className="loading-state"><LoaderCircle className="spin" size={24} /> Loading your model…</div></main>;

  return (
    <main className="viewer-page">
      <header className="viewer-header">
        <a className="brand" href="/"><span className="brand-mark"><Move3D size={17} /></span> formspace</a>
        <div className="viewer-header-right"><span className="live-indicator"><span /> LIVE MODEL</span><button className="text-button" onClick={copyLink}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Share link"}</button></div>
      </header>
      <div className="viewer-layout">
        <section className="viewer-stage">
          <div className="stage-topline"><span><span className="stage-dot" /> INTERACTIVE PREVIEW</span><span>DRAG TO ROTATE · SCROLL TO ZOOM</span></div>
          <model-viewer
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            loading="eager"
            shadow-intensity="1"
            src={model.fileUrl}
            alt={`3D preview of ${model.name}`}
            exposure="1"
            environment-image="neutral"
          >
            <button className="ar-button" slot="ar-button"><ScanLine size={17} /> View in your space</button>
          </model-viewer>
          <div className="stage-caption"><Sparkles size={15} /><span>Your model, ready to step into.</span></div>
        </section>

        <aside className="share-panel">
          <a className="back-link" href="/"><ChevronLeft size={16} /> All models</a>
          <div className="model-heading">
            <div className="model-file-icon"><Box size={22} /></div>
            <div><span className="section-label">YOUR 3D MODEL</span><h1 title={model.name}>{model.name}</h1></div>
          </div>
          <div className="model-meta"><span>{model.format.toUpperCase()}</span><span>{formatBytes(model.size)}</span><span>{model.units}</span></div>
          <div className="panel-divider" />
          <div className="share-heading"><h2>Take it with you</h2><p>Scan to open this model on a phone and view it in AR.</p></div>
          <div className="qr-box">
            <QRCodeCanvas ref={qrRef} value={shareUrl} size={156} level="M" includeMargin />
          </div>
          <button className="primary-button copy-button" onClick={copyLink}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Link copied" : "Copy share link"}</button>
          <button className="secondary-button qr-toggle" onClick={downloadQr}><QrCode size={16} />Download QR code<ChevronRight size={15} /></button>
          <p className="qr-help"><Smartphone size={14} /> Opens on iPhone with AR Quick Look or Android with Scene Viewer.</p>
        </aside>
      </div>
      <footer className="viewer-footer"><span>Powered by <a href="/">Formspace</a></span><a href="/">Create your own <ChevronRight size={14} /></a></footer>
    </main>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function onUploaded(id) {
    const nextPath = `/model/${encodeURIComponent(id)}`;
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  const match = path.match(/^\/model\/([^/]+)\/?$/);
  return match ? <SharedModel id={decodeURIComponent(match[1])} /> : <Landing onUploaded={onUploaded} />;
}
