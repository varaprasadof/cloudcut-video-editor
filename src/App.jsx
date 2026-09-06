import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import AdminDashboard from './AdminDashboard';
import { 
  FolderPlus, Video, Type, Download, Play, Pause, Scissors, LogOut, 
  ShieldAlert, RotateCcw, Trash2, Check,
  ZoomIn, ZoomOut, Music, Gauge, Film,
  Wand2, Subtitles, Mic, Palette, Save, FolderOpen
} from 'lucide-react';

const TEXT_TEMPLATES = [
  { id: 'title', label: 'Title text', font: 'Montserrat', size: 68, color: '#ffffff', bold: true, stroke: '#000000', strokeW: 4 },
  { id: 'handwrite', label: 'Hand Write', font: 'Caveat', size: 76, color: '#ffffff', bold: false, stroke: '#000000', strokeW: 2 },
  { id: 'italic', label: 'Italic Text', font: 'Playfair Display', size: 60, color: '#ffffff', italic: true, stroke: '#000000', strokeW: 2 },
  { id: 'meme', label: 'MEME TEXT', font: 'Anton', size: 80, color: '#ffffff', bold: true, stroke: '#000000', strokeW: 8 },
  { id: 'strict', label: 'STRICT', font: 'Bebas Neue', size: 82, color: '#ffffff', bold: true, stroke: '#000000', strokeW: 4 }
];

const TRANSITIONS = [
  { id: 'none', label: 'Cut (None)' },
  { id: 'fadeBlack', label: 'Fade to Black' },
  { id: 'crossfade', label: 'Cross Dissolve' },
  { id: 'wipe', label: 'Wipe Left' },
  { id: 'zoom', label: 'Zoom Burst' }
];

const CINEMATIC_LUTS = [
  { id: 'normal', label: 'Standard (Off)', filter: '' },
  { id: 'tealOrange', label: 'Teal & Orange', filter: 'contrast(125%) saturate(140%) hue-rotate(-15deg)' },
  { id: 'vhs', label: 'VHS Glitch 90s', filter: 'contrast(150%) saturate(80%) sepia(30%) hue-rotate(20deg)' },
  { id: 'noir', label: 'B&W Film Noir', filter: 'grayscale(100%) contrast(160%)' },
  { id: 'warm', label: 'Retro Warm Gold', filter: 'sepia(45%) saturate(130%) contrast(110%)' }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('editor');
  const [sidebarTab, setSidebarTab] = useState('media');
  const [topSubTab, setTopSubTab] = useState('Effects');

  // Multi-Clip Sequence Engine
  const [clips, setClips] = useState([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [activeTransition, setActiveTransition] = useState('none');
  const [activeLut, setActiveLut] = useState('normal');

  // Aspect Ratio Presets
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // Audio & Playback
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [bgAudioSrc, setBgAudioSrc] = useState(null);

  // Transform & Framing
  const [scaleMode, setScaleMode] = useState('fit');
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropInset, setCropInset] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

  // Lighting Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Chroma Key (PRO)
  const [chromaKeyEnabled, setChromaKeyEnabled] = useState(false);
  const [chromaKeyColor, setChromaKeyColor] = useState('#00ff00');
  const [chromaTolerance, setChromaTolerance] = useState(90);

  // Auto-Captions & Subtitles Engine
  const [subtitles, setSubtitles] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Overlays
  const [textLayers, setTextLayers] = useState([]);
  const [pipVideoOverlays, setPipVideoOverlays] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [selectedOverlayType, setSelectedOverlayType] = useState(null);

  // Export State & Tiered Resolution
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState('mp4');
  const [exportResolution, setExportResolution] = useState('720p'); // '720p', '1080p', '2k'

  // Dragging & Scrubbing
  const [isScrubbing, setIsScrubbing] = useState(false);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, initialW: 0, initialH: 0 });

  // DOM Refs
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const timelineRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const isPro = profile?.plan === 'PRO';

  const totalDuration = clips.reduce((acc, c) => acc + (c.trimEnd - c.trimStart), 0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        fetchProfile(session.user.id);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        setSession(session);
        fetchProfile(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (id) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setView('editor');
  };

  const handleUpgradePro = () => {
    const options = {
      key: "rzp_test_YOUR_KEY_HERE",
      amount: 79900,
      currency: "INR",
      name: "CloudCut Studio",
      description: "CloudCut Lifetime PRO Access",
      image: "/favicon.svg",
      handler: async function (response) {
        if (response.razorpay_payment_id) {
          if (session?.user?.id) {
            await supabase
              .from("profiles")
              .update({ plan: "PRO" })
              .eq("id", session.user.id);
          }
          alert("🎉 Payment Successful! PRO plan unlocked.");
        }
      },
      prefill: {
        email: session?.user?.email || "user@example.com",
      },
      theme: {
        color: "#6366f1",
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const loadFont = (fontFamily) => {
    if (!fontFamily) return;
    const cleanFont = fontFamily.trim().replace(/\s+/g, '+');
    const id = `gfont-${cleanFont}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${cleanFont}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  };

  // Timeline Navigation & Drag-to-Scrub
  const handleScrub = (e) => {
    if (!timelineRef.current || !videoRef.current || !totalDuration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const targetTotalTime = (clickX / rect.width) * totalDuration;

    let accumulated = 0;
    for (let i = 0; i < clips.length; i++) {
      const clipDur = clips[i].trimEnd - clips[i].trimStart;
      if (targetTotalTime <= accumulated + clipDur || i === clips.length - 1) {
        setActiveClipIndex(i);
        const clipTime = clips[i].trimStart + (targetTotalTime - accumulated);
        videoRef.current.currentTime = Math.max(clips[i].trimStart, Math.min(clips[i].trimEnd, clipTime));
        setCurrentTime(targetTotalTime);
        break;
      }
      accumulated += clipDur;
    }
  };

  // Multi-Video Clip Import
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const tempVideo = document.createElement('video');
      const url = URL.createObjectURL(file);
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        setClips((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            name: file.name,
            url,
            duration: tempVideo.duration,
            trimStart: 0,
            trimEnd: tempVideo.duration
          }
        ]);
      };
    });
  };

  // PiP Video Overlay Import
  const handleCustomVideoOverlayUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.src = url;
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;

      vid.onloadedmetadata = () => {
        vid.play().catch(() => {});
        const aspect = vid.videoWidth / vid.videoHeight || 1.77;
        const initialWidth = 340;
        const newPip = {
          id: Date.now() + Math.random(),
          name: file.name,
          url,
          videoElement: vid,
          x: 100,
          y: 100,
          width: initialWidth,
          height: initialWidth / aspect,
          aspectRatio: aspect,
          opacity: 100
        };
        setPipVideoOverlays((prev) => [...prev, newPip]);
        setSelectedLayerId(newPip.id);
        setSelectedOverlayType('video');
      };
    });
  };

  // Audio Import
  const handleDeviceAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBgAudioSrc(url);
    if (audioRef.current) {
      audioRef.current.src = url;
      if (isPlaying) audioRef.current.play();
    }
  };

  // Auto-Captions Engine
  const startAutoCaptions = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is supported directly in Google Chrome, Edge, and Safari.');
      return;
    }

    setIsTranscribing(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1][0].transcript;
      const stamp = videoRef.current ? videoRef.current.currentTime : 0;
      setSubtitles((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: latest.trim(),
          start: Math.max(0, stamp - 1),
          end: stamp + 2.5
        }
      ]);
    };

    recognition.onerror = () => setIsTranscribing(false);
    recognition.onend = () => setIsTranscribing(false);

    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
    recognition.start();
  };

  const togglePlay = () => {
    if (!clips.length || !videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      pipVideoOverlays.forEach((p) => p.videoElement?.pause());
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        if (audioRef.current && bgAudioSrc) audioRef.current.play();
        pipVideoOverlays.forEach((p) => p.videoElement?.play().catch(() => {}));
        setIsPlaying(true);
      }).catch(() => {});
    }
  };

  const handleStop = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = clips[0]?.trimStart || 0;
      setActiveClipIndex(0);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // Precision Split Tool
  const handleSplitClip = () => {
    if (!clips.length || !videoRef.current) return;
    const clip = clips[activeClipIndex];
    if (!clip) return;

    const currentLocalTime = videoRef.current.currentTime;
    if (currentLocalTime <= clip.trimStart + 0.2 || currentLocalTime >= clip.trimEnd - 0.2) return;

    const cleanBaseName = clip.name.replace(/ \(Part \d+\)/g, '');
    const first = { ...clip, id: Date.now(), name: `${cleanBaseName} (Part 1)`, trimEnd: currentLocalTime };
    const second = { ...clip, id: Date.now() + 1, name: `${cleanBaseName} (Part 2)`, trimStart: currentLocalTime };

    const updated = [...clips];
    updated.splice(activeClipIndex, 1, first, second);
    setClips(updated);
  };

  // Delete Active Cut
  const handleDeleteClip = () => {
    if (!clips.length) return;
    const updated = clips.filter((_, idx) => idx !== activeClipIndex);
    setClips(updated);
    setActiveClipIndex(Math.max(0, activeClipIndex - 1));
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Trim Slider Handles
  const handleUpdateTrim = (clipId, trimType, deltaSeconds) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c;
        if (trimType === 'start') {
          const nextStart = Math.max(0, Math.min(c.trimEnd - 0.5, c.trimStart + deltaSeconds));
          return { ...c, trimStart: nextStart };
        } else {
          const nextEnd = Math.max(c.trimStart + 0.5, Math.min(c.duration, c.trimEnd + deltaSeconds));
          return { ...c, trimEnd: nextEnd };
        }
      })
    );
  };

  // Save Project as JSON
  const handleSaveProjectFile = () => {
    const projectData = {
      version: '1.0.0',
      timestamp: Date.now(),
      aspectRatio,
      brightness,
      contrast,
      saturation,
      activeTransition,
      activeLut,
      textLayers,
      subtitles,
      clips: clips.map((c) => ({ id: c.id, name: c.name, duration: c.duration, trimStart: c.trimStart, trimEnd: c.trimEnd }))
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_${Date.now()}.cloudcut`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Load Project
  const handleLoadProjectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.aspectRatio) setAspectRatio(data.aspectRatio);
        if (data.brightness !== undefined) setBrightness(data.brightness);
        if (data.contrast !== undefined) setContrast(data.contrast);
        if (data.saturation !== undefined) setSaturation(data.saturation);
        if (data.activeTransition) setActiveTransition(data.activeTransition);
        if (data.activeLut) setActiveLut(data.activeLut);
        if (data.textLayers) setTextLayers(data.textLayers);
        if (data.subtitles) setSubtitles(data.subtitles);
        alert('Project loaded successfully! (Re-select video clips if paths changed)');
      } catch (err) {
        alert('Invalid project file.');
      }
    };
    reader.readAsText(file);
  };

  // Canvas Interactions
  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (selectedOverlayType === 'video') {
      const activePip = pipVideoOverlays.find((p) => p.id === selectedLayerId);
      if (activePip) {
        const brX = activePip.x + activePip.width;
        const brY = activePip.y + activePip.height;
        if (Math.hypot(mouseX - brX, mouseY - brY) < 30) {
          isResizingRef.current = true;
          resizeStartRef.current = { x: mouseX, y: mouseY, initialW: activePip.width, initialH: activePip.height };
          return;
        }
      }
    }

    for (let i = pipVideoOverlays.length - 1; i >= 0; i--) {
      const pip = pipVideoOverlays[i];
      if (mouseX >= pip.x && mouseX <= pip.x + pip.width && mouseY >= pip.y && mouseY <= pip.y + pip.height) {
        setSelectedLayerId(pip.id);
        setSelectedOverlayType('video');
        isDraggingRef.current = true;
        dragOffsetRef.current = { x: mouseX - pip.x, y: mouseY - pip.y };
        return;
      }
    }

    for (let i = textLayers.length - 1; i >= 0; i--) {
      const l = textLayers[i];
      const ctx = canvas.getContext('2d');
      ctx.font = `${l.size}px "${l.fontFamily}"`;
      const w = ctx.measureText(l.text).width;
      if (mouseX >= l.x - 10 && mouseX <= l.x + w + 10 && mouseY >= l.y - l.size && mouseY <= l.y + 10) {
        setSelectedLayerId(l.id);
        setSelectedOverlayType('text');
        isDraggingRef.current = true;
        dragOffsetRef.current = { x: mouseX - l.x, y: mouseY - l.y };
        return;
      }
    }

    setSelectedLayerId(null);
    setSelectedOverlayType(null);
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (isResizingRef.current && selectedLayerId && selectedOverlayType === 'video') {
      const deltaX = mouseX - resizeStartRef.current.x;
      const newW = Math.max(80, Math.min(canvas.width, resizeStartRef.current.initialW + deltaX));
      setPipVideoOverlays((prev) =>
        prev.map((p) => (p.id === selectedLayerId ? { ...p, width: newW, height: newW / (p.aspectRatio || 1.77) } : p))
      );
      return;
    }

    if (isDraggingRef.current && selectedLayerId) {
      if (selectedOverlayType === 'video') {
        setPipVideoOverlays((prev) =>
          prev.map((pip) =>
            pip.id === selectedLayerId
              ? { ...pip, x: mouseX - dragOffsetRef.current.x, y: mouseY - dragOffsetRef.current.y }
              : pip
          )
        );
      } else if (selectedOverlayType === 'text') {
        setTextLayers((prev) =>
          prev.map((l) =>
            l.id === selectedLayerId
              ? { ...l, x: mouseX - dragOffsetRef.current.x, y: mouseY - dragOffsetRef.current.y }
              : l
          )
        );
      }
    }
  };

  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
    isResizingRef.current = false;
  };

  const getCanvasDimensions = () => {
    const baseW = isPro ? 2560 : 1280;
    switch (aspectRatio) {
      case '9:16': return { width: isPro ? 1440 : 720, height: baseW };
      case '1:1': return { width: isPro ? 1920 : 1080, height: isPro ? 1920 : 1080 };
      case '4:5': return { width: isPro ? 1600 : 864, height: isPro ? 2000 : 1080 };
      default: return { width: baseW, height: isPro ? 1440 : 720 };
    }
  };

  // 60 FPS Render Pipeline
  useEffect(() => {
    const renderFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const { width: targetW, height: targetH } = getCanvasDimensions();

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        const selectedLutObj = CINEMATIC_LUTS.find((l) => l.id === activeLut);
        const lutFilter = selectedLutObj ? selectedLutObj.filter : '';
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${lutFilter}`;

        const srcX = video.videoWidth * (cropInset.left / 100);
        const srcY = video.videoHeight * (cropInset.top / 100);
        const srcW = video.videoWidth * (1 - (cropInset.left + cropInset.right) / 100);
        const srcH = video.videoHeight * (1 - (cropInset.top + cropInset.bottom) / 100);

        if (scaleMode === 'fill') {
          ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
        } else {
          const ratio = Math.min(canvas.width / srcW, canvas.height / srcH);
          const cx = (canvas.width - srcW * ratio) / 2;
          const cy = (canvas.height - srcH * ratio) / 2;
          ctx.drawImage(video, srcX, srcY, srcW, srcH, cx, cy, srcW * ratio, srcH * ratio);
        }
        ctx.filter = 'none';
        ctx.restore();

        // Chroma Key (PRO)
        if (chromaKeyEnabled && isPro) {
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = frame.data;
          const targetR = parseInt(chromaKeyColor.slice(1, 3), 16);
          const targetG = parseInt(chromaKeyColor.slice(3, 5), 16);
          const targetB = parseInt(chromaKeyColor.slice(5, 7), 16);

          for (let i = 0; i < data.length; i += 4) {
            const diff = Math.hypot(data[i] - targetR, data[i + 1] - targetG, data[i + 2] - targetB);
            if (diff < chromaTolerance) data[i + 3] = 0;
          }
          ctx.putImageData(frame, 0, 0);
        }

        // Render PiP Videos
        pipVideoOverlays.forEach((pip) => {
          if (pip.videoElement && pip.videoElement.readyState >= 2) {
            ctx.save();
            ctx.globalAlpha = (pip.opacity || 100) / 100;
            ctx.drawImage(pip.videoElement, pip.x, pip.y, pip.width, pip.height);
            ctx.restore();
          }
        });

        // Render Text
        textLayers.forEach((l) => {
          const font = `${l.isBold ? 'bold ' : ''}${l.size}px "${l.fontFamily}", sans-serif`;
          ctx.font = font;
          if (l.strokeWidth > 0) {
            ctx.strokeStyle = l.strokeColor;
            ctx.lineWidth = l.strokeWidth;
            ctx.strokeText(l.text, l.x, l.y);
          }
          ctx.fillStyle = l.color;
          ctx.fillText(l.text, l.x, l.y);
        });

        // Render Subtitles
        const activeSub = subtitles.find(
          (s) => video.currentTime >= s.start && video.currentTime <= s.end
        );
        if (activeSub) {
          ctx.font = 'bold 36px Montserrat, sans-serif';
          const subMetrics = ctx.measureText(activeSub.text);
          const subX = (canvas.width - subMetrics.width) / 2;
          const subY = canvas.height - 70;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(subX - 16, subY - 38, subMetrics.width + 32, 50);

          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 5;
          ctx.strokeText(activeSub.text, subX, subY);
          ctx.fillStyle = '#facc15';
          ctx.fillText(activeSub.text, subX, subY);
        }

        // Sync Global Time Position
        let elapsed = 0;
        for (let i = 0; i < activeClipIndex; i++) {
          elapsed += (clips[i].trimEnd - clips[i].trimStart);
        }
        const currentClipPos = Math.max(0, video.currentTime - (clips[activeClipIndex]?.trimStart || 0));
        setCurrentTime(elapsed + currentClipPos);
      }
      requestRef.current = requestAnimationFrame(renderFrame);
    };

    requestRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [
    brightness, contrast, saturation, scaleMode, rotation, flipH, flipV,
    cropInset, aspectRatio, activeTransition, activeLut, chromaKeyEnabled, chromaKeyColor, chromaTolerance, isPro,
    textLayers, pipVideoOverlays, subtitles, clips, activeClipIndex
  ]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Safe Client-Side Exporter with Guaranteed Timeout Completion
  const startClientSideExport = () => {
    if (!canvasRef.current || !videoRef.current) return;

    setIsExporting(true);
    setExportProgress(5);
    recordedChunksRef.current = [];

    const stream = canvasRef.current.captureStream(60);
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      if (videoRef.current) {
        const videoAudio = audioCtx.createMediaElementSource(videoRef.current);
        videoAudio.connect(dest);
        videoAudio.connect(audioCtx.destination);
      }
      if (audioRef.current && bgAudioSrc) {
        const bgAudio = audioCtx.createMediaElementSource(audioRef.current);
        bgAudio.connect(dest);
        bgAudio.connect(audioCtx.destination);
      }

      const combinedTracks = [...stream.getVideoTracks(), ...dest.stream.getAudioTracks()];
      mediaRecorderRef.current = new MediaRecorder(new MediaStream(combinedTracks), {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
        videoBitsPerSecond: isPro ? 14000000 : 4000000
      });
    } catch (e) {
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
    }

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const extension = exportFormat === 'mp4' ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunksRef.current, { type: `video/${extension}` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CloudCut_${exportResolution}_${Date.now()}.${extension}`;
      a.click();
      window.URL.revokeObjectURL(url);
      setIsExporting(false);
      setExportProgress(0);
    };

    videoRef.current.currentTime = clips[0]?.trimStart || 0;
    videoRef.current.play();
    if (audioRef.current) audioRef.current.play();
    pipVideoOverlays.forEach((p) => p.videoElement?.play().catch(() => {}));
    mediaRecorderRef.current.start(100);

    let simulatedProgress = 5;
    const exportInterval = setInterval(() => {
      simulatedProgress = Math.min(99, simulatedProgress + 4);
      setExportProgress(simulatedProgress);
    }, 200);

    const totalDurationMs = (totalDuration || 5) * 1000;
    setTimeout(() => {
      clearInterval(exportInterval);
      setExportProgress(100);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
    }, totalDurationMs + 500);
  };

  if (!session) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#111216]">
        <div className="w-full max-w-sm rounded-2xl bg-[#191a20] p-6 border border-gray-800 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
            <Video size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">CloudCut Studio</h2>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => {
                setSession({ user: { id: 'admin-123', email: 'admin@studio.com' } });
                setProfile({ id: 'admin-123', email: 'admin@studio.com', role: 'admin', plan: 'PRO' });
              }}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black hover:bg-amber-400 flex items-center justify-center gap-1.5"
            >
              <ShieldAlert size={14} /> Launch as Site Admin (PRO)
            </button>
            <button
              onClick={() => {
                setSession({ user: { id: 'user-free', email: 'freeuser@test.com' } });
                setProfile({ id: 'user-free', email: 'freeuser@test.com', role: 'user', plan: 'FREE' });
              }}
              className="w-full rounded-xl bg-gray-800 py-2.5 text-xs font-semibold text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700"
            >
              Launch as Normal Free User
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return <AdminDashboard onBack={() => { setView('editor'); if (session) fetchProfile(session.user.id); }} />;
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0e0f13] text-gray-200 select-none overflow-hidden font-sans">
      {bgAudioSrc && <audio ref={audioRef} src={bgAudioSrc} loop />}

      {/* Top Navbar */}
      <header className="flex h-12 items-center justify-between border-b border-[#23242c] bg-[#16171d] px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              C
            </div>
            <span className="font-semibold text-xs text-white tracking-wide">CloudCut Editor</span>
            <button 
              onClick={handleUpgradePro}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                isPro 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
              }`}
              title="Click to Upgrade via Razorpay"
            >
              {isPro ? 'PRO Active ⭐' : 'Upgrade to PRO ⚡'}
            </button>
          </div>

          <div className="h-4 w-[1px] bg-gray-700" />

          {/* Aspect Ratio Presets */}
          <div className="flex items-center bg-[#101115] p-0.5 rounded-lg border border-gray-800 text-xs">
            {['16:9', '9:16', '1:1', '4:5'].map((r) => (
              <button
                key={r}
                onClick={() => setAspectRatio(r)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${aspectRatio === r ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-gray-700" />

          {/* Project Save & Load */}
          <div className="flex items-center gap-1">
            <button onClick={handleSaveProjectFile} className="flex items-center gap-1 text-xs text-gray-300 hover:text-white bg-[#1a1b22] px-2.5 py-1 rounded border border-gray-800" title="Save Project (.cloudcut)">
              <Save size={13} /> Save Project
            </button>
            <label className="flex items-center gap-1 text-xs text-gray-300 hover:text-white bg-[#1a1b22] px-2.5 py-1 rounded border border-gray-800 cursor-pointer" title="Load Project (.cloudcut)">
              <FolderOpen size={13} /> Open
              <input type="file" accept=".cloudcut,.json" className="hidden" onChange={handleLoadProjectFile} />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setView('admin')} 
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
            >
              <ShieldAlert size={14} /> Admin Panel
            </button>
          )}

          {/* Tiered Export Resolution Selector */}
          <select
            value={exportResolution}
            onChange={(e) => {
              const val = e.target.value;
              if ((val === '1080p' || val === '2k') && !isPro) {
                handleUpgradePro();
              } else {
                setExportResolution(val);
              }
            }}
            className="bg-[#101115] text-xs font-semibold text-gray-300 border border-gray-800 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
          >
            <option value="720p">720p HD (Free)</option>
            <option value="1080p">1080p Full HD {isPro ? '' : '🔒 (PRO)'}</option>
            <option value="2k">2K Cinematic {isPro ? '' : '🔒 (PRO)'}</option>
          </select>

          {/* Export Format Selector */}
          <div className="flex bg-[#101115] p-0.5 rounded-lg border border-gray-800 text-[10px] font-bold">
            <button onClick={() => setExportFormat('mp4')} className={`px-2 py-0.5 rounded ${exportFormat === 'mp4' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>MP4</button>
            <button onClick={() => setExportFormat('webm')} className={`px-2 py-0.5 rounded ${exportFormat === 'webm' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>WEBM</button>
          </div>

          <button 
            onClick={startClientSideExport}
            disabled={isExporting || !clips.length}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 disabled:opacity-40"
          >
            <Download size={14} /> {isExporting ? `Exporting (${exportProgress}%)` : `Export ${exportResolution}`}
          </button>
          <div className="h-4 w-[1px] bg-gray-700" />
          <button onClick={handleLogout} className="p-1 text-gray-400 hover:text-white"><LogOut size={16} /></button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <aside className="flex w-14 flex-col items-center border-r border-[#23242c] bg-[#121318] py-3 gap-5 shrink-0">
          <button onClick={() => setSidebarTab('media')} className={`p-2 rounded-xl transition ${sidebarTab === 'media' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Media">
            <FolderPlus size={18} />
          </button>
          <button onClick={() => setSidebarTab('pip')} className={`p-2 rounded-xl transition ${sidebarTab === 'pip' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="PiP Video Overlay">
            <Video size={18} />
          </button>
          <button onClick={() => setSidebarTab('audio')} className={`p-2 rounded-xl transition ${sidebarTab === 'audio' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Audio & Music">
            <Music size={18} />
          </button>
          <button onClick={() => setSidebarTab('captions')} className={`p-2 rounded-xl transition ${sidebarTab === 'captions' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Auto-Captions">
            <Subtitles size={18} />
          </button>
          <button onClick={() => setSidebarTab('text')} className={`p-2 rounded-xl transition ${sidebarTab === 'text' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Text">
            <Type size={18} />
          </button>
        </aside>

        {/* Drawer Controls Panel */}
        <aside className="w-88 border-r border-[#23242c] bg-[#16171d] flex flex-col shrink-0">
          <div className="flex h-10 border-b border-[#23242c] bg-[#14151a] px-3 items-center justify-between text-xs text-gray-400">
            {['Effects', 'Transform', 'Adjust', 'Speed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setTopSubTab(tab)}
                className={`px-2 py-1 font-medium transition ${topSubTab === tab ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'hover:text-gray-200'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {topSubTab === 'Effects' && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2 flex items-center gap-1.5">
                    <Wand2 size={14} className="text-indigo-400" /> Clip Transitions
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSITIONS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTransition(t.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${activeTransition === t.id ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-[#272832] bg-[#1c1d25] text-gray-300 hover:bg-[#252632]'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2 flex items-center gap-1.5">
                    <Palette size={14} className="text-amber-400" /> Cinematic LUT Presets
                  </span>
                  <div className="space-y-1.5">
                    {CINEMATIC_LUTS.map((lut) => (
                      <button
                        key={lut.id}
                        onClick={() => setActiveLut(lut.id)}
                        className={`w-full p-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition ${activeLut === lut.id ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-[#272832] bg-[#1c1d25] text-gray-400 hover:text-white'}`}
                      >
                        <span>{lut.label}</span>
                        {activeLut === lut.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {sidebarTab === 'captions' && (
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Auto-Speech Captions</span>
                <button
                  onClick={startAutoCaptions}
                  disabled={isTranscribing || !clips.length}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Mic size={15} /> {isTranscribing ? 'Listening & Transcribing...' : 'Generate Auto-Captions'}
                </button>

                <div className="space-y-1.5 pt-2 border-t border-gray-800">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase block">Generated Lines ({subtitles.length})</span>
                  {subtitles.map((s) => (
                    <div key={s.id} className="p-2 rounded-lg border border-[#272832] bg-[#1c1d25] text-xs">
                      <p className="font-semibold text-yellow-400 truncate">{s.text}</p>
                      <span className="text-[10px] text-gray-500">{formatTime(s.start)} - {formatTime(s.end)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sidebarTab === 'media' && (
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Video Tracks</span>
                <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-[#1c1d25] p-3 text-center hover:border-indigo-500 transition">
                  <Video size={20} className="text-gray-500 mb-1" />
                  <span className="text-xs text-gray-300 font-medium">Add Video Clips</span>
                  <input type="file" accept="video/*" multiple className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}
          </div>
        </aside>

        {/* Viewport Canvas */}
        <main className="flex flex-1 flex-col items-center justify-center bg-black p-4 relative overflow-hidden">
          <div className="relative aspect-video w-full max-w-4xl rounded border border-gray-800 bg-[#090a0d] flex items-center justify-center overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              src={clips[activeClipIndex]?.url || null}
              className="hidden"
              playsInline
              crossOrigin="anonymous"
              onEnded={() => {
                if (activeClipIndex < clips.length - 1) setActiveClipIndex(activeClipIndex + 1);
                else setIsPlaying(false);
              }}
            />

            {clips.length > 0 ? (
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className="h-full w-full object-contain cursor-crosshair"
              />
            ) : (
              <div className="text-center text-gray-600">
                <Film size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">Import a video clip to begin editing</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Multi-Track Timeline with Continuous Proportional Blocks and Smooth Playhead */}
      <footer className="h-48 border-t border-[#23242c] bg-[#121318] flex flex-col shrink-0">
        <div className="flex h-9 items-center justify-between border-b border-[#23242c] bg-[#16171d] px-4">
          <div className="flex items-center gap-2">
            {/* Play / Pause */}
            <button onClick={togglePlay} disabled={!clips.length} className="p-1 text-white hover:text-indigo-400" title="Play / Pause">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            {/* Stop & Reset */}
            <button onClick={handleStop} disabled={!clips.length} className="p-1 text-gray-300 hover:text-red-400" title="Stop & Reset">
              <RotateCcw size={15} />
            </button>
            {/* Split */}
            <button onClick={handleSplitClip} disabled={!clips.length} className="flex items-center gap-1 text-xs text-gray-300 hover:text-white px-2 py-0.5 rounded hover:bg-gray-800">
              <Scissors size={13} /> Split
            </button>
            {/* Delete Clip */}
            <button onClick={handleDeleteClip} disabled={!clips.length} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-500/10">
              <Trash2 size={13} /> Delete Clip
            </button>
          </div>

          <div className="font-mono text-xs text-indigo-400">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>

          <div className="flex items-center gap-2 text-gray-400">
            <button onClick={() => setTimelineZoom(Math.max(0.5, timelineZoom - 0.2))}><ZoomOut size={14} /></button>
            <button onClick={() => setTimelineZoom(Math.min(3, timelineZoom + 0.2))}><ZoomIn size={14} /></button>
          </div>
        </div>

        {/* Proportional Scrubbable Timeline */}
        <div 
          ref={timelineRef} 
          onMouseDown={(e) => {
            setIsScrubbing(true);
            handleScrub(e);
          }}
          onMouseMove={(e) => {
            if (isScrubbing) handleScrub(e);
          }}
          onMouseUp={() => setIsScrubbing(false)}
          onMouseLeave={() => setIsScrubbing(false)}
          className="relative flex-1 p-3 bg-[#0d0e12] flex flex-col justify-center cursor-ew-resize select-none overflow-hidden"
        >
          {/* Red Playhead Indicator */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-red-500 pointer-events-none z-30 flex flex-col items-center"
            style={{ 
              left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
              transition: isPlaying ? 'none' : 'left 0.05s linear'
            }}
          >
            <div className="w-3 h-3 bg-red-500 rotate-45 -mt-1 shadow-md shadow-red-500/50" />
          </div>

          {/* Connected Proportional Clips */}
          <div className="relative flex w-full h-16 bg-[#16171d] rounded-lg overflow-hidden border border-gray-800 z-10">
            {clips.map((clip, idx) => {
              const clipDur = clip.trimEnd - clip.trimStart;
              const widthPct = totalDuration > 0 ? (clipDur / totalDuration) * 100 : 100;

              return (
                <div
                  key={clip.id}
                  onClick={(e) => { e.stopPropagation(); setActiveClipIndex(idx); }}
                  style={{ width: `${widthPct}%` }}
                  className={`relative h-full border-r border-gray-900/80 flex items-center justify-between px-2 transition-colors ${
                    activeClipIndex === idx 
                      ? 'bg-amber-500/20 border-b-2 border-b-amber-400 text-white' 
                      : 'bg-[#1c1d25] hover:bg-[#232430] text-gray-400'
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUpdateTrim(clip.id, 'start', 0.5); }}
                    className="h-full w-2 hover:w-3 bg-gray-700/60 hover:bg-amber-500 rounded-l text-[8px] text-gray-300 flex items-center justify-center cursor-ew-resize transition-all"
                    title="Trim Start (+0.5s)"
                  >
                    |
                  </button>

                  <div className="flex flex-col items-center truncate px-1 pointer-events-none">
                    <span className="text-[10px] font-semibold truncate">{clip.name}</span>
                    <span className="text-[9px] font-mono text-gray-400">{formatTime(clipDur)}</span>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleUpdateTrim(clip.id, 'end', -0.5); }}
                    className="h-full w-2 hover:w-3 bg-gray-700/60 hover:bg-amber-500 rounded-r text-[8px] text-gray-300 flex items-center justify-center cursor-ew-resize transition-all"
                    title="Trim End (-0.5s)"
                  >
                    |
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}