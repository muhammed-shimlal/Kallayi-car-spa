'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ServiceData {
    id: string;
    num: string;
    title: string;
    image: string;
    story: string;
}

const SERVICES: ServiceData[] = [
    {
        id: "signature-exterior",
        num: "01",
        title: "Signature Exterior Wash",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTE5XdC1anAdex0QVPxZa6BFVxum8zF2u3NtrmNbiciz397TESjgKkU8Kw5&s=10",
        story: "We begin by meticulously cleansing every inch of your vehicle's exterior. Our process is designed to restore the original gloss of the paintwork, finishing with detailed wheel and alloy care. A premium tire wax application ensures a flawless, spot-free presentation as it leaves our bay."
    },
    {
        id: "complete-interior-exterior",
        num: "02",
        title: "Complete Interior & Exterior",
        image: "https://i.pinimg.com/originals/58/aa/47/58aa4760777d033c9da6f5c5c7857ae7.jpg",
        story: "Beyond the flawless exterior wash, we step inside to rejuvenate your cabin. Every crevice is deeply vacuumed and dusted. We apply a premium shampoo wash to your mats and upholstery, followed by a dedicated conditioning and waxing of the interior trim to bring back that showroom feel."
    },
    {
        id: "ultimate-360",
        num: "03",
        title: "Ultimate 360° Detail",
        image: "https://i.pinimg.com/originals/bd/29/78/bd2978d979915324c02e9f2a39dea24e.jpg",
        story: "Our most comprehensive transformation. Building upon our full interior and exterior care, we push further into the unseen details. The trunk and cargo areas are deep-cleaned, the engine bay undergoes precision degreasing, and the underbody is entirely pressure-washed for a complete 360-degree reset."
    },
    {
        id: "premium-3m",
        num: "04",
        title: "Premium 3M™ Undercoating",
        image: "https://i.pinimg.com/736x/7b/97/f1/7b97f1a701559036275799affa544dc6.jpg",
        story: "True preservation happens beneath the surface. We apply genuine 3M™ anti-rust protection across the entire chassis. This meticulous coating not only defends your vehicle against harsh weathering and corrosion but significantly dampens road noise and vibration for a quieter, smoother ride."
    }
];

// Cinematic Blur Reveal / Staggered Word Fade Animation
function CinematicText({ text }: { text: string }) {
    const words = text.split(" ");

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.025,
                delayChildren: 0.05,
            },
        },
    };

    const wordVariants = {
        hidden: {
            opacity: 0,
            filter: "blur(10px)",
            y: 10,
        },
        visible: {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            transition: {
                duration: 0.4,
                ease: [0.25, 0.4, 0.25, 1] as const,
            },
        },
    };

    return (
        <motion.p
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap gap-x-1.5 gap-y-1 text-base sm:text-lg text-neutral-200 leading-relaxed font-light tracking-wide"
        >
            {words.map((word, idx) => (
                <motion.span
                    key={`${word}-${idx}`}
                    variants={wordVariants}
                    className="inline-block"
                >
                    {word}
                </motion.span>
            ))}
        </motion.p>
    );
}

export default function ServicesSection() {
    const [activeServiceId, setActiveServiceId] = useState<string>(SERVICES[0].id);

    const activeService = SERVICES.find(s => s.id === activeServiceId) || SERVICES[0];

    return (
        <section className="relative w-full bg-[#000000] text-white py-20 sm:py-28 px-6 sm:px-12 lg:px-16 overflow-hidden border-t border-white/10">
            <div className="max-w-7xl mx-auto min-h-[80vh] flex flex-col justify-center">
                
                {/* Header Badge */}
                <div className="mb-10 sm:mb-14">
                    <span className="hud-label uppercase font-mono tracking-[0.3em] text-neutral-500 text-xs block">
                        SYS. ARCHIVE // SELECT SERVICE
                    </span>
                </div>

                {/* Desktop Split-Screen & Mobile Responsive Architecture */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    
                    {/* LEFT SIDE: SYS. ARCHIVE MENU (col-span-5 on desktop) */}
                    <div className="lg:col-span-5 services-list w-full space-y-1">
                        {SERVICES.map((service) => {
                            const isActive = service.id === activeServiceId;

                            return (
                                <div key={service.id} className="w-full">
                                    {/* EXACT HTML STRUCTURE FOR SERVICE MENU ITEMS */}
                                    <div
                                        className={`service-item reveal-up flex items-center justify-between py-6 sm:py-7 border-b border-white/10 cursor-pointer transition-all duration-300 ${
                                            isActive
                                                ? 'active text-white'
                                                : 'text-neutral-600 hover:text-neutral-300'
                                        }`}
                                        onClick={() => setActiveServiceId(service.id)}
                                    >
                                        <span className="service-num font-display text-sm sm:text-base font-mono tracking-widest mr-4 text-inherit">
                                            {service.num}
                                        </span>
                                        <h2 className="service-title font-display text-lg sm:text-2xl font-light tracking-tight flex-1 text-inherit">
                                            {service.title}
                                        </h2>
                                        <span className={`service-arrow font-display text-xl sm:text-2xl transition-transform duration-300 text-inherit ${isActive ? 'translate-x-1.5' : ''}`}>
                                            →
                                        </span>
                                    </div>

                                    {/* MOBILE ACCORDION REVEAL (< lg BREAKPOINTS ONLY) */}
                                    <div className="block lg:hidden">
                                        <AnimatePresence initial={false}>
                                            {isActive && (
                                                <motion.div
                                                    key={`mobile-${service.id}`}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-4 pb-6 space-y-4">
                                                        <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/10 bg-black shadow-xl">
                                                            <img
                                                                src={service.image}
                                                                alt={service.title}
                                                                className="w-full h-full object-cover filter grayscale brightness-75 contrast-125"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                                            <div className="absolute top-3 left-3 font-mono text-[10px] tracking-[0.25em] uppercase text-neutral-300 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                                                SPECIFICATION // {service.num}
                                                            </div>
                                                        </div>

                                                        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
                                                            <CinematicText text={service.story} />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* RIGHT SIDE: DESKTOP STICKY DISPLAY CANVAS (col-span-7 on desktop, hidden on mobile) */}
                    <div className="hidden lg:block lg:col-span-7 sticky top-24">
                        <div className="relative w-full h-[540px] rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl flex flex-col justify-end">
                            {/* Background Image with Fade & Scale Animation */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeService.id}
                                    initial={{ opacity: 0, scale: 1.03 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as const }}
                                    className="absolute inset-0 w-full h-full"
                                >
                                    <img
                                        src={activeService.image}
                                        alt={activeService.title}
                                        className="w-full h-full object-cover filter grayscale brightness-75 contrast-125"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                                    {/* HUD Specification Tag */}
                                    <div className="absolute top-6 left-6 font-mono text-[11px] tracking-[0.3em] uppercase text-neutral-300 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                                        SPECIFICATION // {activeService.num}
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Editorial Story Overlay Container */}
                            <div className="relative z-10 bg-black/60 backdrop-blur-md border-t border-white/10 p-8 rounded-b-3xl">
                                <AnimatePresence mode="wait">
                                    <motion.div key={`story-${activeService.id}`}>
                                        <div className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400 mb-3">
                                            {activeService.title}
                                        </div>
                                        <CinematicText text={activeService.story} />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </section>
    );
}

