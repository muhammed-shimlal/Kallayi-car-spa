'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface HeroSectionProps {
    onBookingClick: () => void;
    onMagneticMove?: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
    onMagneticLeave?: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
}

const TOTAL_FRAMES = 277;

export default function HeroSection({ onBookingClick, onMagneticMove, onMagneticLeave }: HeroSectionProps) {
    const targetRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const imagesRef = useRef<HTMLImageElement[]>([]);

    // 1. Framer Motion Scroll Progress Controller
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ['start start', 'end end'],
    });

    // Smooth spring physics for continuous, luxury scroll feel
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 90,
        damping: 28,
        restDelta: 0.0001,
    });

    // 2. Framer Motion Transforms for UI & Content Overlays
    const textY = useTransform(smoothProgress, [0, 0.4], [0, -80]);
    const textOpacity = useTransform(smoothProgress, [0, 0.35], [1, 0]);
    const canvasScale = useTransform(smoothProgress, [0, 1], [1, 1.08]);
    const indicatorOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
    const watermarkScale = useTransform(smoothProgress, [0, 1], [1, 1.15]);
    const watermarkOpacity = useTransform(smoothProgress, [0, 0.4, 0.9], [0.15, 0.25, 0.05]);

    // 3. Preload all 277 frames from public/images/HeroSection
    useEffect(() => {
        let isMounted = true;
        const images: HTMLImageElement[] = [];
        let loadedCount = 0;

        for (let i = 1; i <= TOTAL_FRAMES; i++) {
            const img = new window.Image();
            const frameNum = String(i).padStart(3, '0');
            // Path references Next.js public directory /images/HeroSection/ezgif-frame-XXX.jpg
            img.src = `/images/HeroSection/ezgif-frame-${frameNum}.jpg`;

            img.onload = () => {
                if (!isMounted) return;
                loadedCount++;
                if (loadedCount >= Math.floor(TOTAL_FRAMES * 0.25)) {
                    setImagesLoaded(true);
                }
            };
            images[i] = img;
        }

        imagesRef.current = images;

        return () => {
            isMounted = false;
        };
    }, []);

    // 4. Draw frame onto HTML5 Canvas on scroll change
    const renderFrame = (progressVal: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Map progress (0 to 1) to frame index (1 to 277)
        const currentFrame = Math.min(
            TOTAL_FRAMES,
            Math.max(1, Math.floor(progressVal * (TOTAL_FRAMES - 1)) + 1)
        );

        let img = imagesRef.current[currentFrame];

        // Fallback to nearest loaded frame if current frame is loading
        if (!img || !img.complete || img.naturalWidth === 0) {
            for (let offset = 1; offset < 15; offset++) {
                const prev = imagesRef.current[currentFrame - offset];
                if (prev && prev.complete && prev.naturalWidth > 0) {
                    img = prev;
                    break;
                }
                const next = imagesRef.current[currentFrame + offset];
                if (next && next.complete && next.naturalWidth > 0) {
                    img = next;
                    break;
                }
            }
        }

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Object-fit: cover implementation for canvas
            const hRatio = canvas.width / img.width;
            const vRatio = canvas.height / img.height;
            const ratio = Math.max(hRatio, vRatio);
            const centerShiftX = (canvas.width - img.width * ratio) / 2;
            const centerShiftY = (canvas.height - img.height * ratio) / 2;

            ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                centerShiftX,
                centerShiftY,
                img.width * ratio,
                img.height * ratio
            );
        }
    };

    // 5. Connect Framer Motion smoothProgress subscriber & canvas resize
    useEffect(() => {
        const unsubscribe = smoothProgress.on('change', (val) => {
            renderFrame(val);
        });

        const resizeCanvas = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                renderFrame(smoothProgress.get());
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => {
            unsubscribe();
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [smoothProgress]);

    return (
        <div ref={targetRef} className="relative w-full h-[350vh] bg-[#050505] text-white">
            {/* Sticky Viewport Window */}
            <div className="sticky top-0 left-0 w-full h-screen overflow-hidden flex items-center justify-center">
                
                {/* Scroll-Linked Canvas Sequence Player */}
                <motion.canvas
                    ref={canvasRef}
                    style={{ scale: canvasScale }}
                    className="absolute inset-0 w-full h-full object-cover z-0 filter contrast-125 brightness-95"
                />

                {/* Luxury Vignette & Radial Shadow Layer */}
                <div 
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(5,5,5,0) 25%, rgba(5,5,5,0.7) 70%, rgba(5,5,5,0.98) 100%)'
                    }}
                />

                {/* Red Neon Glow Ambient Spot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#E52323]/10 rounded-full blur-[150px] pointer-events-none z-10" />

                {/* Huge Ghost Watermark */}
                <motion.h1 
                    style={{ scale: watermarkScale, opacity: watermarkOpacity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[22vw] font-black tracking-tighter text-white/20 drop-shadow-[0_0_50px_rgba(255,255,255,0.08)] whitespace-nowrap z-10 pointer-events-none select-none"
                >
                    KALLAYI
                </motion.h1>

                {/* Foreground Hero Content (Framer Motion Animated) */}
                <motion.div 
                    style={{ y: textY, opacity: textOpacity }}
                    className="absolute bottom-24 left-8 sm:left-16 z-20"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E52323] animate-ping" />
                        <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-slate-400 font-mono">
                            SYS. ONLINE // VEHICLE SPA
                        </span>
                    </div>

                    <button 
                        onClick={onBookingClick}
                        onMouseMove={onMagneticMove}
                        onMouseLeave={onMagneticLeave}
                        className="group relative bg-transparent border-none text-white font-display text-6xl sm:text-8xl font-black tracking-tight cursor-pointer flex flex-col items-start outline-none transition-transform duration-300 ease-out"
                    >
                        <span>BOOK</span>
                        <span className="h-1.5 w-12 bg-[#E52323] mt-3 group-hover:w-full transition-all duration-500 ease-[cubic-bezier(0.77,0,0.175,1)] shadow-[0_0_20px_rgba(229,35,35,0.8)]" />
                    </button>
                </motion.div>

                {/* Animated Scroll Down Indicator */}
                <motion.div 
                    style={{ opacity: indicatorOpacity }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20 pointer-events-none"
                >
                    <span className="text-[10px] font-bold tracking-[0.4em] text-slate-400 font-display uppercase">
                        SCROLL
                    </span>
                    <div className="w-0.5 h-14 bg-white/10 overflow-hidden relative rounded-full">
                        <div className="w-full h-full bg-[#E52323] animate-[scrollWhip_2s_cubic-bezier(0.77,0,0.175,1)_infinite]" />
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
