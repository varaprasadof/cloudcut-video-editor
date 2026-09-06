import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import AdminDashboard from './AdminDashboard';
import { 
  FolderPlus, Video, Type, Download, Play, Pause, Scissors, LogOut, 
  ShieldAlert, RotateCcw, Trash2, Check, ZoomIn, ZoomOut, Music, Film,
  Wand2, Subtitles, Mic, Palette, Save, FolderOpen, Crown, Lock, Sparkles, CheckCircle2
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
  
  // Navigation views: 'home', 'pricing', 'editor', 'admin'
  const [view, setView] = useState('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [sidebarTab, setSidebarTab] = useState('media');
  const [topSubTab, setTopSubTab] = useState('Effects');

  // Multi-Clip Sequence Engine & Free Limits
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
  const [bgAudioSrc, setBgAudioSrc] = useState(null);

  // Transform, Framing & Lighting
  const [scaleMode] = useState('fit');
  const [rotation] = useState(0);
  const [flipH] = useState(false);
  const [flipV] = useState(false);
  const [cropInset] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [brightness] = useState(100);
  const [contrast] = useState(100);
  const [saturation] = useState(100);
  const [chromaKeyEnabled] = useState(false);
  const [chromaKeyColor] = useState('#00ff00');
  const [chromaTolerance] = useState(90);

  // Auto-Captions
  const [subtitles, setSubtitles] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Overlays
  const [textLayers] = useState([]);
  const [pipVideoOverlays, setPipVideoOverlays] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [selectedOverlayType, setSelectedOverlayType] = useState(null);

  // Export & Resolution
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState('mp4');
  const [exportResolution, setExportResolution] = useState('720p');

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

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        const userId = data?.user?.id || 'mock-user-id';
        setSession({ user: { id: userId, email: authEmail } });
        setProfile({ id: userId, email: authEmail, plan: 'FREE', edits_count: 0, role: 'user' });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setSession(data.session);
        fetchProfile(data.user.id);
      }
      setShowAuthModal(false);
      setView('editor');
    } catch (err) {
      console.warn("Supabase auth fallback active:", err.message);
      setSession({ user: { id: 'local-test-user', email: authEmail } });
      setProfile({ id: 'local-test-user', email: authEmail, plan: 'FREE', edits_count: 0, role: 'user' });
      setShowAuthModal(false);
      setView('editor');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setView('home');
  };

  // Two-Step Manual UTR Submission for Admin Approval
  const handleUpgradePro = () => {
    const utrNumber = window.prompt(
      "CloudCut Studio Direct UPI Checkout\n\n1. Pay ₹799 to UPI ID: yourname@paytm\n2. Enter your 12-digit UPI Transaction Reference ID (UTR) below for admin approval:"
    );

    if (utrNumber && utrNumber.trim().length >= 6) {
      submitUtrForApproval(utrNumber.trim());
    } else if (utrNumber !== null) {
      alert("Please enter a valid Transaction Reference ID (UTR).");
    }
  };

  const submitUtrForApproval = async (utr) => {
    try {
      if (session?.user?.id && session.user.id !== 'local-test-user') {
        const { error } = await supabase.from("payments").insert([
          {
            user_id: session.user.id,
            email: session.user.email,
            utr: utr,
            status: 'pending'
          }
        ]);

        if (error) {
          console.error("Payment insert error:", error.message);
          alert("Error submitting UTR. Please ensure your 'payments' table is created in Supabase.");
          return;
        }
      }

      alert("⏳ Payment submitted successfully! Your UTR is now pending admin review. Once verified in our bank account, your account will be upgraded to PRO.");
      setView('home');
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
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

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const tempVideo = document.createElement('video');
      const url = URL.createObjectURL(file);
      tempVideo.src = url;
      tempVideo.onloadedmetadata = async () => {
        if (!isPro && tempVideo.duration > 60) {
          alert('Free users can only edit videos up to 1 minute long. Upgrade to PRO for unlimited length!');
          return;
        }
        if (!isPro && (profile?.edits_count || 0) >= 3) {
          alert('You have reached your 3 free video edits limit! Please upgrade to PRO for unlimited editing.');
          setView('pricing');
          return;
        }

        if (!isPro && session?.user?.id && session.user.id !== 'local-test-user') {
          const newCount = (profile?.edits_count || 0) + 1;
          await supabase.from('profiles').update({ edits_count: newCount }).eq('id', session.user.id);
          fetchProfile(session.user.id);
        }

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
      setSubtitles((prev) => [...prev, { id: Date.now(), text: latest.trim(), start: Math.max(0, stamp - 1), end: stamp + 2.5 }]);
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

  const handleUpdateTrim = (clipId, trimType, deltaSeconds) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c;
        if (trimType === 'start') {
          return { ...c, trimStart: Math.max(0, Math.min(c.trimEnd - 0.5, c.trimStart + deltaSeconds)) };
        } else {
          return { ...c, trimEnd: Math.max(c.trimStart + 0.5, Math.min(c.duration, c.trimEnd + deltaSeconds)) };
        }
      })
    );
  };

  const handleSaveProjectFile = () => {
    const projectData = {
      version: '1.0.0',
      timestamp: Date.now(),
      aspectRatio,
      activeTransition,
      activeLut,
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

  const handleLoadProjectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.aspectRatio) setAspectRatio(data.aspectRatio);
        if (data.activeTransition) setActiveTransition(data.activeTransition);
        if (data.activeLut) setActiveLut(data.activeLut);
        if (data.subtitles) setSubtitles(data.subtitles);
        alert('Project loaded successfully!');
      } catch (err) {
        alert('Invalid project file.');
      }
    };
    reader.readAsText(file);
  };

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
    if (isDraggingRef.current && selectedLayerId && selectedOverlayType === 'video') {
      setPipVideoOverlays((prev) =>
        prev.map((pip) => (pip.id === selectedLayerId ? { ...pip, x: mouseX - dragOffsetRef.current.x, y: mouseY - dragOffsetRef.current.y } : pip))
      );
    }
  };

  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
    isResizingRef.current = false;
  };

  const getCanvasDimensions = () => {
    const baseW = exportResolution === '2k' ? 2560 : exportResolution === '1080p' ? 1920 : 1280;
    switch (aspectRatio) {
      case '9:16': return { width: exportResolution === '2k' ? 1440 : exportResolution === '1080p' ? 1080 : 720, height: baseW };
      case '1:1': return { width: baseW, height: baseW };
      case '4:5': return { width: exportResolution === '2k' ? 1600 : exportResolution === '1080p' ? 1200 : 864, height: exportResolution === '2k' ? 2000 : exportResolution === '1080p' ? 1500 : 1080 };
      default: return { width: baseW, height: exportResolution === '2k' ? 1440 : exportResolution === '1080p' ? 1080 : 720 };
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

        pipVideoOverlays.forEach((pip) => {
          if (pip.videoElement && pip.videoElement.readyState >= 2) {
            ctx.save();
            ctx.globalAlpha = (pip.opacity || 100) / 100;
            ctx.drawImage(pip.videoElement, pip.x, pip.y, pip.width, pip.height);
            ctx.restore();
          }
        });

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
    cropInset, aspectRatio, activeTransition, activeLut, isPro,
    pipVideoOverlays, subtitles, clips, activeClipIndex, exportResolution
  ]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

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
      const combinedTracks = [...stream.getVideoTracks(), ...dest.stream.getAudioTracks()];
      mediaRecorderRef.current = new MediaRecorder(new MediaStream(combinedTracks), {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
        videoBitsPerSecond: exportResolution === '2k' ? 14000000 : exportResolution === '1080p' ? 8000000 : 4000000
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

  // --- RENDERING VIEWS ---

  // 1. HOME / LANDING PAGE VIEW
  if (view === 'home') {
    return (
      <div className="flex min-h-screen flex-col bg-[#0b0c10] text-white font-sans select-none">
        {/* Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-[#23242c] bg-[#121318] px-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">C</div>
            <span className="font-bold text-sm tracking-wide">CloudCut Studio</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-gray-300">
            <button onClick={() => setView('home')} className="hover:text-white transition">Home</button>
            <button onClick={() => setView('pricing')} className="hover:text-white transition">Pricing</button>
            {session && profile?.role === 'admin' && (
              <button onClick={() => setView('admin')} className="text-amber-400 hover:text-amber-300 flex items-center gap-1">
                <ShieldAlert size={14} /> Admin Panel
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-500/30 font-medium">
                  {profile?.plan === 'PRO' ? '⭐ PRO Member' : `Free Edits: ${profile?.edits_count || 0}/3`}
                </span>
                <button onClick={() => setView('editor')} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md">
                  Open Editor
                </button>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-white"><LogOut size={16} /></button>
              </div>
            ) : (
              <>
                <button onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} className="text-xs font-semibold text-gray-300 hover:text-white px-3 py-2">
                  Log in
                </button>
                <button onClick={() => { setIsSignUp(true); setShowAuthModal(true); }} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md">
                  Sign up
                </button>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center bg-gradient-to-b from-[#121318] to-[#0b0c10]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles size={14} /> Next-Gen Browser Video Editing Suite
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
            Effortless editing. <span className="text-indigo-500">Unskippable videos.</span>
          </h1>
          <p className="mt-4 text-sm md:text-base text-gray-400 max-w-xl">
            Create multi-clip timelines, add cinematic LUTs, auto-captions, and PiP overlays directly in your browser. Free users get up to 3 video edits with 1-minute lengths.
          </p>
          <div className="mt-8 flex gap-4">
            <button 
              onClick={() => {
                if (!session) setShowAuthModal(true);
                else setView('editor');
              }} 
              className="rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
            >
              Get Started Free &gt;
            </button>
            <button onClick={() => setView('pricing')} className="rounded-2xl bg-[#191a20] border border-gray-800 px-6 py-3.5 text-sm font-bold text-gray-300 hover:text-white hover:bg-[#20212b] transition">
              View Pricing Plans
            </button>
          </div>
        </section>

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#16171d] p-8 border border-gray-800 shadow-2xl relative">
              <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white">✕</button>
              <h2 className="text-xl font-bold text-white mb-2">{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
              <p className="text-xs text-gray-400 mb-6">Account login is mandatory to access the video editor and manage your projects.</p>
              
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={authEmail} 
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-xl bg-[#101115] border border-gray-800 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={authPassword} 
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-[#101115] border border-gray-800 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 shadow-md">
                  {isSignUp ? 'Sign Up & Start Editing' : 'Log In to Editor'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-indigo-400 hover:underline">
                  {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. PRICING PAGE VIEW
  if (view === 'pricing') {
    return (
      <div className="flex min-h-screen flex-col bg-[#0b0c10] text-white font-sans select-none">
        <header className="flex h-16 items-center justify-between border-b border-[#23242c] bg-[#121318] px-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">C</div>
            <span className="font-bold text-sm tracking-wide">CloudCut Studio</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-gray-300">
            <button onClick={() => setView('home')} className="hover:text-white transition">Home</button>
            <button onClick={() => setView('pricing')} className="text-indigo-400 font-bold">Pricing</button>
          </div>
          <button onClick={() => setView('editor')} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500">
            Back to Editor
          </button>
        </header>

        <section className="flex flex-1 flex-col items-center py-16 px-4">
          <h2 className="text-3xl md:text-5xl font-extrabold text-center">Simple, Transparent Pricing</h2>
          <p className="text-xs md:text-sm text-gray-400 mt-2 text-center max-w-md">Pay via UPI and submit your UTR for admin approval to unlock your PRO workspace.</p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
            {/* Free Plan */}
            <div className="rounded-3xl bg-[#16171d] border border-gray-800 p-8 flex flex-col justify-between shadow-xl">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Free Tier</span>
                <h3 className="text-2xl font-bold mt-2">₹0 <span className="text-xs font-normal text-gray-400">/ forever</span></h3>
                <ul className="mt-6 space-y-3 text-xs text-gray-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500" /> Up to 3 video edits</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500" /> Max 1-minute video length</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500" /> 720p HD Exports</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500" /> Standard Timeline & Split tools</li>
                </ul>
              </div>
              <button 
                onClick={() => {
                  if (!session) setShowAuthModal(true);
                  else setView('editor');
                }} 
                className="mt-8 w-full rounded-xl bg-gray-800 py-3 text-xs font-bold text-gray-200 hover:bg-gray-700"
              >
                {session ? 'Current Free Plan' : 'Get Started Free'}
              </button>
            </div>

            {/* PRO Plan */}
            <div className="rounded-3xl bg-gradient-to-b from-indigo-950/40 to-[#16171d] border-2 border-indigo-500/50 p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1"><Crown size={14} /> PRO Lifetime</span>
                <h3 className="text-2xl font-bold mt-2">₹799 <span className="text-xs font-normal text-gray-400">/ one-time</span></h3>
                <ul className="mt-6 space-y-3 text-xs text-gray-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Unlimited video edits</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Unlimited video duration</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> 1080p Full HD & 2K Cinematic Exports</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Advanced Chroma Key & PiP Video Overlays</li>
                </ul>
              </div>
              <button 
                onClick={() => {
                  if (!session) {
                    setShowAuthModal(true);
                  } else {
                    handleUpgradePro();
                  }
                }}
                className="mt-8 w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30"
              >
                {isPro ? '⭐ PRO Active' : 'Upgrade & Unlock PRO ⚡'}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // 3. ADMIN PANEL VIEW
  if (view === 'admin') {
    return <AdminDashboard onBack={() => { setView('editor'); if (session) fetchProfile(session.user.id); }} />;
  }

  // 4. EDITOR VIEW (Mandatory Login Guard)
  if (!session) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b0c10]">
        <div className="w-full max-w-sm rounded-3xl bg-[#16171d] p-8 border border-gray-800 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <Lock size={22} />
          </div>
          <h2 className="text-xl font-bold text-white">Login Required</h2>
          <p className="text-xs text-gray-400 mt-2 mb-6">Account login is mandatory to access CloudCut Studio's video editor and track your free edit allocations.</p>
          <button onClick={() => setShowAuthModal(true)} className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 shadow-md">
            Log In or Sign Up
          </button>
          <button onClick={() => setView('home')} className="mt-3 w-full text-xs text-gray-400 hover:text-white py-2">
            &larr; Back to Home
          </button>

          {showAuthModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-3xl bg-[#16171d] p-8 border border-gray-800 shadow-2xl relative text-left">
                <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white">✕</button>
                <h2 className="text-xl font-bold text-white mb-2">{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
                <form onSubmit={handleAuthSubmit} className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={authEmail} 
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full rounded-xl bg-[#101115] border border-gray-800 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Password</label>
                    <input 
                      type="password" 
                      required
                      value={authPassword} 
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-[#101115] border border-gray-800 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 shadow-md">
                    {isSignUp ? 'Sign Up & Start Editing' : 'Log In'}
                  </button>
                </form>
                <div className="mt-4 text-center">
                  <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-indigo-400 hover:underline">
                    {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0e0f13] text-gray-200 select-none overflow-hidden font-sans">
      {bgAudioSrc && <audio ref={audioRef} src={bgAudioSrc} loop />}

      {/* Top Navbar */}
      <header className="flex h-12 items-center justify-between border-b border-[#23242c] bg-[#16171d] px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">C</div>
            <span className="font-semibold text-xs text-white tracking-wide">CloudCut Editor</span>
            <button 
              onClick={handleUpgradePro}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                isPro ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
              }`}
            >
              {isPro ? 'PRO Active ⭐' : 'Upgrade to PRO ⚡'}
            </button>
          </div>

          <div className="h-4 w-[1px] bg-gray-700" />
          <div className="flex items-center bg-[#101115] p-0.5 rounded-lg border border-gray-800 text-xs">
            {['16:9', '9:16', '1:1', '4:5'].map((r) => (
              <button key={r} onClick={() => setAspectRatio(r)} className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${aspectRatio === r ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {r}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-gray-700" />
          <div className="flex items-center gap-1">
            <button onClick={handleSaveProjectFile} className="flex items-center gap-1 text-xs text-gray-300 hover:text-white bg-[#1a1b22] px-2.5 py-1 rounded border border-gray-800">
              <Save size={13} /> Save
            </button>
            <label className="flex items-center gap-1 text-xs text-gray-300 hover:text-white bg-[#1a1b22] px-2.5 py-1 rounded border border-gray-800 cursor-pointer">
              <FolderOpen size={13} /> Open
              <input type="file" accept=".cloudcut,.json" className="hidden" onChange={handleLoadProjectFile} />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile?.role === 'admin' && (
            <button onClick={() => setView('admin')} className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
              <ShieldAlert size={14} /> Admin Panel
            </button>
          )}

          {/* Tiered Resolution Buttons */}
          <div className="flex items-center bg-[#101115] border border-gray-800 rounded-lg p-0.5 text-xs">
            <button onClick={() => setExportResolution('720p')} className={`px-2.5 py-1 rounded font-semibold transition ${exportResolution === '720p' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              720p HD
            </button>
            <button onClick={() => { if (!isPro) handleUpgradePro(); else setExportResolution('1080p'); }} className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${exportResolution === '1080p' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              1080p {!isPro && '🔒'}
            </button>
            <button onClick={() => { if (!isPro) handleUpgradePro(); else setExportResolution('2k'); }} className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${exportResolution === '2k' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              2K {!isPro && '🔒'}
            </button>
          </div>

          <button onClick={startClientSideExport} disabled={isExporting || !clips.length} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40">
            <Download size={14} /> {isExporting ? `Exporting (${exportProgress}%)` : `Export ${exportResolution}`}
          </button>
          <div className="h-4 w-[1px] bg-gray-700" />
          <button onClick={handleLogout} className="p-1 text-gray-400 hover:text-white"><LogOut size={16} /></button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <aside className="flex w-14 flex-col items-center border-r border-[#23242c] bg-[#121318] py-3 gap-5 shrink-0">
          <button onClick={() => setSidebarTab('media')} className={`p-2 rounded-xl transition ${sidebarTab === 'media' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Media">
            <FolderPlus size={18} />
          </button>
          <button onClick={() => setSidebarTab('pip')} className={`p-2 rounded-xl transition ${sidebarTab === 'pip' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="PiP Video">
            <Video size={18} />
          </button>
          <button onClick={() => setSidebarTab('audio')} className={`p-2 rounded-xl transition ${sidebarTab === 'audio' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Audio">
            <Music size={18} />
          </button>
          <button onClick={() => setSidebarTab('captions')} className={`p-2 rounded-xl transition ${sidebarTab === 'captions' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Captions">
            <Subtitles size={18} />
          </button>
        </aside>

        {/* Drawer Panel */}
        <aside className="w-88 border-r border-[#23242c] bg-[#16171d] flex flex-col shrink-0">
          <div className="flex h-10 border-b border-[#23242c] bg-[#14151a] px-3 items-center justify-between text-xs text-gray-400">
            {['Effects', 'Transform', 'Adjust', 'Speed'].map((tab) => (
              <button key={tab} onClick={() => setTopSubTab(tab)} className={`px-2 py-1 font-medium transition ${topSubTab === tab ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'hover:text-gray-200'}`}>
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
                      <button key={t.id} onClick={() => setActiveTransition(t.id)} className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${activeTransition === t.id ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-[#272832] bg-[#1c1d25] text-gray-300'}`}>
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
                      <button key={lut.id} onClick={() => setActiveLut(lut.id)} className={`w-full p-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition ${activeLut === lut.id ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-[#272832] bg-[#1c1d25] text-gray-400'}`}>
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
                <button onClick={startAutoCaptions} disabled={isTranscribing || !clips.length} className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50">
                  <Mic size={15} /> {isTranscribing ? 'Listening...' : 'Generate Auto-Captions'}
                </button>
              </div>
            )}

            {sidebarTab === 'media' && (
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Video Tracks</span>
                <div className="text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-lg">
                  {isPro ? '⭐ PRO: Unlimited clips & duration' : `Free User: ${profile?.edits_count || 0}/3 Edits Used (Max 1 min)`}
                </div>
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
              <canvas ref={canvasRef} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} className="h-full w-full object-contain cursor-crosshair" />
            ) : (
              <div className="text-center text-gray-600">
                <Film size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">Import a video clip to begin editing</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Timeline Footer */}
      <footer className="h-48 border-t border-[#23242c] bg-[#121318] flex flex-col shrink-0">
        <div className="flex h-9 items-center justify-between border-b border-[#23242c] bg-[#16171d] px-4">
          <div className="flex items-center gap-2">
            <button onClick={togglePlay} disabled={!clips.length} className="p-1 text-white hover:text-indigo-400" title="Play/Pause">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={handleStop} disabled={!clips.length} className="p-1 text-gray-300 hover:text-red-400" title="Stop">
              <RotateCcw size={15} />
            </button>
            <button onClick={handleSplitClip} disabled={!clips.length} className="flex items-center gap-1 text-xs text-gray-300 hover:text-white px-2 py-0.5 rounded hover:bg-gray-800">
              <Scissors size={13} /> Split
            </button>
            <button onClick={handleDeleteClip} disabled={!clips.length} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-500/10">
              <Trash2 size={13} /> Delete
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

        {/* Timeline Tracks */}
        <div ref={timelineRef} onMouseDown={(e) => { setIsScrubbing(true); handleScrub(e); }} onMouseMove={(e) => { if (isScrubbing) handleScrub(e); }} onMouseUp={() => setIsScrubbing(false)} onMouseLeave={() => setIsScrubbing(false)} className="relative flex-1 p-3 bg-[#0d0e12] flex flex-col justify-center cursor-ew-resize select-none overflow-hidden">
          <div className="absolute top-0 bottom-0 w-[2px] bg-red-500 pointer-events-none z-30 flex flex-col items-center" style={{ left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}>
            <div className="w-3 h-3 bg-red-500 rotate-45 -mt-1 shadow-md shadow-red-500/50" />
          </div>

          <div className="relative flex w-full h-16 bg-[#16171d] rounded-lg overflow-hidden border border-gray-800 z-10">
            {clips.map((clip, idx) => {
              const clipDur = clip.trimEnd - clip.trimStart;
              const widthPct = totalDuration > 0 ? (clipDur / totalDuration) * 100 : 100;
              return (
                <div key={clip.id} onClick={(e) => { e.stopPropagation(); setActiveClipIndex(idx); }} style={{ width: `${widthPct}%` }} className={`relative h-full border-r border-gray-900/80 flex items-center justify-between px-2 transition-colors ${activeClipIndex === idx ? 'bg-amber-500/20 border-b-2 border-b-amber-400 text-white' : 'bg-[#1c1d25] text-gray-400'}`}>
                  <button onClick={(e) => { e.stopPropagation(); handleUpdateTrim(clip.id, 'start', 0.5); }} className="h-full w-2 bg-gray-700/60 hover:bg-amber-500 rounded-l text-[8px] text-gray-300 flex items-center justify-center cursor-ew-resize">|</button>
                  <div className="flex flex-col items-center truncate px-1 pointer-events-none">
                    <span className="text-[10px] font-semibold truncate">{clip.name}</span>
                    <span className="text-[9px] font-mono text-gray-400">{formatTime(clipDur)}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleUpdateTrim(clip.id, 'end', -0.5); }} className="h-full w-2 bg-gray-700/60 hover:bg-amber-500 rounded-r text-[8px] text-gray-300 flex items-center justify-center cursor-ew-resize">|</button>
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}