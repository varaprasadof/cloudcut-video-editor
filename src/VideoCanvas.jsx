import React, { useRef, useEffect } from 'react';

export default function VideoCanvas({ 
  videoSrc, 
  isPlaying, 
  brightness, 
  contrast, 
  onTimeUpdate,
  chromaKeyEnabled,
  chromaKeyColor = '#00ff00',
  textLayers = []
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // Sync play/pause with parent controls
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Main rendering loop onto Canvas (60 FPS)
  const renderFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && !video.paused && !video.ended) {
      const ctx = canvas.getContext('2d');

      // Set canvas internal resolution to video's native resolution
      if (video.videoWidth && canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Apply real-time visual adjustments (Brightness & Contrast)
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none'; // Reset filter for overlays

      // Chroma Key (Green Screen) Processing (CPU/ImageData pass)
      if (chromaKeyEnabled) {
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        const targetR = parseInt(chromaKeyColor.slice(1, 3), 16);
        const targetG = parseInt(chromaKeyColor.slice(3, 5), 16);
        const targetB = parseInt(chromaKeyColor.slice(5, 7), 16);
        const tolerance = 90; // Sensitivity

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check distance to green screen color
          const diff = Math.sqrt(
            Math.pow(r - targetR, 2) + 
            Math.pow(g - targetG, 2) + 
            Math.pow(b - targetB, 2)
          );

          if (diff < tolerance) {
            data[i + 3] = 0; // Transparent
          }
        }
        ctx.putImageData(frame, 0, 0);
      }

      // Render Text Overlays
      textLayers.forEach(layer => {
        ctx.font = `${layer.size || 40}px Arial`;
        ctx.fillStyle = layer.color || '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(layer.text, layer.x || 50, layer.y || 100);
      });

      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime, video.duration);
      }
    }

    requestRef.current = requestAnimationFrame(renderFrame);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [brightness, contrast, chromaKeyEnabled, chromaKeyColor, textLayers]);

  return (
    <div className="relative aspect-video w-full max-w-4xl rounded-2xl border border-dark-700 bg-black shadow-2xl flex items-center justify-center overflow-hidden">
      {/* Hidden native HTML5 video element providing frames */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="hidden"
        playsInline
        crossOrigin="anonymous"
        onLoadedMetadata={() => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth || 1280;
            canvasRef.current.height = videoRef.current.videoHeight || 720;
          }
        }}
      />

      {/* Visible real-time editing Canvas */}
      {videoSrc ? (
        <canvas ref={canvasRef} className="h-full w-full object-contain" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <p className="text-sm">No video loaded</p>
          <span className="text-xs text-gray-600">Import a video clip on the left panel to begin</span>
        </div>
      )}
    </div>
  );
}