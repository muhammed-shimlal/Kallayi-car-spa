'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, ShieldCheck, Clock, ExternalLink } from 'lucide-react';

export default function ServiceAreaMap() {
    const [mapView, setMapView] = useState<'map' | 'radar'>('map');

    const MAP_IFRAME_URL = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3915.0424913934976!2d76.10384187509344!3d11.110211189059598!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba6360ae6e8e407%3A0x8b58074e4c6db434!2sVattapara-%20Pattarkulam%20Road%2C%20Manjeri%2C%20Kerala!5e0!3m2!1sen!2sin!4v1784803750355!5m2!1sen!2sin";
    const DIRECTIONS_URL = "https://www.google.com/maps/dir/?api=1&destination=Vattapara-+Pattarkulam+Road,+Manjeri,+Kerala";

    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full bg-[#050505] text-white py-20 sm:py-28 px-6 sm:px-12 lg:px-16 overflow-hidden border-t border-white/10"
        >
            <div className="max-w-7xl mx-auto">
                
                {/* Section Header */}
                <div className="mb-12 sm:mb-16">
                    <span className="hud-label uppercase font-mono tracking-[0.3em] text-neutral-500 text-xs block mb-2">
                        SYS. LOCATION // SINGLE FLAGSHIP BAY
                    </span>
                    <h2 className="font-display text-3xl sm:text-5xl font-light tracking-tight uppercase text-white">
                        Location & Directions
                    </h2>
                </div>

                {/* Responsive Grid Layout */}
                <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                    
                    {/* LEFT / EDITORIAL DETAILS BLOCK */}
                    <div className="w-full lg:w-5/12 space-y-6">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-mono text-xs text-neutral-300">
                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                                <span>MANJERI, KERALA</span>
                            </div>

                            <h3 className="font-display text-xl sm:text-3xl font-light tracking-wide text-white">
                                Flagship Facility & Detailing Bay
                            </h3>
                            <p className="text-neutral-400 text-sm sm:text-base font-light leading-relaxed">
                                Located on Vattapara-Pattarkulam Road, Manjeri. Our dedicated single-facility car spa is equipped with climate-controlled ceramic coating bays, high-pressure underbody washers, and premium 3M™ anti-rust application bays.
                            </p>
                        </div>

                        {/* Telemetry Status Cards */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="bg-white/[0.02] border border-white/10 p-4 rounded-xl space-y-1">
                                <span className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase block flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-emerald-400" />
                                    OPERATING HOURS
                                </span>
                                <span className="font-mono text-xs sm:text-sm font-semibold text-white block">MON – SUN</span>
                                <span className="font-mono text-[11px] text-neutral-400 block">07:00 – 19:00 IST</span>
                            </div>

                            <div className="bg-white/[0.02] border border-white/10 p-4 rounded-xl space-y-1">
                                <span className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase block flex items-center gap-1">
                                    <Navigation className="w-3 h-3 text-cyan-400" />
                                    COORDINATES
                                </span>
                                <span className="font-mono text-xs sm:text-sm font-semibold text-white block">11.1102° N</span>
                                <span className="font-mono text-[11px] text-neutral-400 block">76.1038° E</span>
                            </div>
                        </div>

                        {/* Address & Feature List */}
                        <div className="space-y-3 pt-2 text-xs font-mono text-neutral-400 tracking-wider border-t border-white/10 pt-6">
                            <div className="flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 text-white shrink-0 mt-0.5" />
                                <div>
                                    <span className="text-white font-medium block">Vattapara-Pattarkulam Road</span>
                                    <span>Manjeri, Malappuram District, Kerala</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 pt-1">
                                <ShieldCheck className="w-4 h-4 text-white shrink-0" />
                                <span>100% DEDICATED SINGLE SHOP LOCATION</span>
                            </div>
                        </div>

                        {/* Directions CTA Button */}
                        <div className="pt-2">
                            <a
                                href={DIRECTIONS_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-white text-black font-mono text-xs font-semibold tracking-widest uppercase rounded-xl hover:bg-neutral-200 transition-colors duration-300 shadow-xl"
                            >
                                <span>GET DIRECTIONS ON GOOGLE MAPS</span>
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* RIGHT / CINEMATIC GOOGLE MAPS EMBED & RADAR CANVAS */}
                    <div className="w-full lg:w-7/12 relative">
                        <div className="relative w-full h-[420px] sm:h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
                            
                            {/* Top View Toggle Switch */}
                            <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-black/85 backdrop-blur-md border border-white/15 p-1 rounded-full text-[10px] font-mono tracking-widest uppercase">
                                <button
                                    onClick={() => setMapView('map')}
                                    className={`px-3 py-1 rounded-full transition-all duration-300 ${
                                        mapView === 'map' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    SATELLITE / MAP
                                </button>
                                <button
                                    onClick={() => setMapView('radar')}
                                    className={`px-3 py-1 rounded-full transition-all duration-300 ${
                                        mapView === 'radar' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    RADAR TELEMETRY
                                </button>
                            </div>

                            {/* View 1: Dark-Styled Interactive Google Map */}
                            {mapView === 'map' && (
                                <div className="relative w-full h-full">
                                    <iframe
                                        src={MAP_IFRAME_URL}
                                        width="100%"
                                        height="100%"
                                        style={{
                                            border: 0,
                                            filter: 'grayscale(100%) invert(92%) contrast(125%) brightness(90%)'
                                        }}
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        title="Kallayi Car Spa Location Map"
                                        className="w-full h-full"
                                    />
                                    {/* Subtle Gradient Overlay to Blend Edges with Dark Theme */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />
                                </div>
                            )}

                            {/* View 2: High-Tech Abstract Radar Telemetry */}
                            {mapView === 'radar' && (
                                <div className="relative w-full h-full flex items-center justify-center bg-black">
                                    {/* Technical Grid Lines */}
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

                                    {/* Concentric Radar Circles */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-[200px] sm:w-[280px] h-[200px] sm:h-[280px] rounded-full border border-white/10 animate-spin [animation-duration:40s]" />
                                        <div className="absolute w-[340px] sm:w-[440px] h-[340px] sm:h-[440px] rounded-full border border-white/5" />
                                        <div className="absolute w-full h-[1px] bg-white/5" />
                                        <div className="absolute h-full w-[1px] bg-white/5" />
                                    </div>

                                    {/* Radar Sweep */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                        <div className="w-[360px] sm:w-[480px] h-[360px] sm:h-[480px] rounded-full bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(255,255,255,0.15)_360deg)] animate-spin [animation-duration:12s]" />
                                    </div>

                                    {/* Center Pulse Marker for Manjeri Shop */}
                                    <div className="relative flex items-center justify-center z-20">
                                        <motion.div
                                            animate={{ scale: [1, 2.6], opacity: [0.8, 0] }}
                                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                                            className="absolute w-8 h-8 rounded-full border border-white bg-white/10 pointer-events-none"
                                        />
                                        <div className="relative w-4 h-4 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,1)]" />

                                        <div className="absolute top-6 whitespace-nowrap bg-black/85 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-lg text-center shadow-2xl">
                                            <span className="font-mono text-xs uppercase tracking-widest text-white font-semibold block flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                KALLAYI CAR SPA // MANJERI
                                            </span>
                                            <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider block">
                                                VATTAPARA-PATTARKULAM ROAD
                                            </span>
                                        </div>
                                    </div>

                                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#000000_90%)] pointer-events-none" />
                                </div>
                            )}

                            {/* Bottom Grid Coordinate Legend */}
                            <div className="absolute bottom-4 right-4 z-30 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                11.1102° N // 76.1038° E
                            </div>

                        </div>
                    </div>

                </div>

            </div>
        </motion.section>
    );
}
