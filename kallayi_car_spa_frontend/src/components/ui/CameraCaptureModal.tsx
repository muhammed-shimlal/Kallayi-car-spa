"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Check, X, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  title?: string;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = "Capture Back Number Plate Proof"
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeStreamRef = useRef<MediaStream | null>(null);

  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const stopCameraStream = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }
  }, []);

  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setIsInitializing(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in your current browser.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      activeStreamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let msg = "Could not access device camera. Please upload an image file instead.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Camera permission was denied. Please grant camera permissions or upload an image file.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "No camera hardware detected. Please upload an image file.";
      }
      setCameraError(msg);
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode, stopCameraStream]);

  useEffect(() => {
    if (isOpen && !capturedPreview) {
      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, capturedPreview, facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error("Failed to capture video frame.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Error creating image snapshot.");
        return;
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `number_plate_${timestamp}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      setCapturedFile(file);
      setCapturedPreview(previewUrl);
      stopCameraStream();
    }, 'image/jpeg', 0.92);
  };

  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setCapturedFile(null);
    startCameraStream();
  };

  const handleConfirm = () => {
    if (capturedFile && capturedPreview) {
      onCapture(capturedFile, capturedPreview);
      onClose();
      toast.success("Number plate proof attached!");
    } else {
      toast.error("Please capture or upload a photo first.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setCapturedFile(file);
    setCapturedPreview(previewUrl);
    stopCameraStream();
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-[#0c0d10] border border-white/10 rounded-[2.5rem] w-full max-w-xl shadow-[0_0_80px_rgba(1,255,255,0.15)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#01FFFF]/10 border border-[#01FFFF]/30 text-[#01FFFF]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-syncopate font-bold text-sm tracking-wider text-white uppercase">{title}</h3>
              <p className="text-[10px] text-[#8E939B] font-mono tracking-widest mt-0.5">Khata Credit Photo Verification</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Content Container with Strict Dimensions */}
        <div className="p-4 sm:p-6 flex items-center justify-center bg-black/60 flex-shrink-0">
          <div className="relative w-full aspect-video min-h-[260px] max-h-[340px] rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
            {capturedPreview ? (
              /* Snapshot Preview Mode */
              <div className="relative w-full h-full bg-black flex items-center justify-center">
                <img
                  src={capturedPreview}
                  alt="Captured Number Plate Proof"
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">Photo Ready</span>
                </div>
              </div>
            ) : cameraError ? (
              /* Error / Fallback Upload Mode */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-red-950/20">
                <AlertCircle className="w-10 h-10 text-[#FF2A6D] mb-2" />
                <h4 className="font-bold text-xs text-white mb-1 uppercase tracking-wide">Camera Unavailable</h4>
                <p className="text-[11px] text-zinc-400 max-w-sm mb-4">{cameraError}</p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#01FFFF] text-slate-950 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white transition shadow-[0_0_20px_rgba(1,255,255,0.3)] active:scale-95"
                >
                  <Upload className="w-4 h-4" /> Upload Number Plate Photo
                </button>
              </div>
            ) : (
              /* Live Camera Feed */
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Viewfinder Reticle Overlay */}
                <div className="absolute inset-4 sm:inset-6 border-2 border-dashed border-[#01FFFF]/40 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between text-[10px] font-mono text-[#01FFFF] tracking-widest bg-black/60 px-2 py-1 rounded w-fit backdrop-blur-sm">
                    ALIGN BACK NUMBER PLATE
                  </div>
                  <div className="text-right text-[10px] font-mono text-zinc-400 bg-black/60 px-2 py-1 rounded w-fit ml-auto backdrop-blur-sm">
                    {facingMode === 'environment' ? 'REAR CAM' : 'FRONT CAM'}
                  </div>
                </div>

                {isInitializing && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs font-bold text-[#01FFFF] tracking-widest uppercase animate-pulse">
                    Starting Camera...
                  </div>
                )}
              </>
            )}
          </div>

          {/* Hidden Canvas & File Input */}
          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-4">
          {!capturedPreview && !cameraError && (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition hover:bg-white/10 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" /> Switch Camera
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition hover:bg-white/10 active:scale-95"
                >
                  <ImageIcon className="w-4 h-4" /> Upload File
                </button>

                <button
                  type="button"
                  onClick={handleCapture}
                  className="px-6 py-3.5 bg-[#FF2A6D] text-white font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-rose-600 transition shadow-[0_0_25px_rgba(255,42,109,0.4)] flex items-center gap-2 active:scale-95"
                >
                  <Camera className="w-4 h-4" /> Capture Photo
                </button>
              </div>
            </>
          )}

          {capturedPreview && (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition hover:bg-white/10 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" /> Retake Photo
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="px-8 py-3.5 bg-[#01FFFF] text-slate-950 font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white transition shadow-[0_0_25px_rgba(1,255,255,0.4)] flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" /> Attach Proof Photo
              </button>
            </>
          )}

          {cameraError && !capturedPreview && (
            <button
              type="button"
              onClick={startCameraStream}
              className="ml-auto px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition hover:bg-white/10 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" /> Retry Camera
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
