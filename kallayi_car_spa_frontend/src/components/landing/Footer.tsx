'use client';

import React, { useState } from 'react';
import { Instagram, Twitter, Facebook, Youtube, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Footer() {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim()) {
            setSubscribed(true);
            setEmail('');
            setTimeout(() => setSubscribed(false), 5000);
        }
    };

    const navLinks = [
        { label: 'Services Archive', href: '#services' },
        { label: 'About Experience', href: '#about' },
        { label: 'Booking Bay', href: '/login' },
        { label: 'Client Verdict', href: '#reviews' },
        { label: 'FAQ & Support', href: '#faq' },
    ];

    const socialLinks = [
        { icon: Instagram, label: 'Instagram', href: 'https://instagram.com' },
        { icon: Twitter, label: 'X (Twitter)', href: 'https://x.com' },
        { icon: Facebook, label: 'Facebook', href: 'https://facebook.com' },
        { icon: Youtube, label: 'YouTube', href: 'https://youtube.com' },
    ];

    return (
        <footer className="relative w-full bg-[#050505] text-white overflow-hidden">
            {/* 2. The Gradient Separator */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="max-w-7xl mx-auto py-16 sm:py-20 px-6 sm:px-12 lg:px-16 flex flex-col justify-between">

                {/* 3. Grid Layout (Desktop lg:grid-cols-12 vs Mobile flex-col gap-y-10) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 mb-16 sm:mb-20">

                    {/* Brand Column (lg:col-span-4) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div>
                            <span className="hud-label uppercase font-mono tracking-[0.3em] text-neutral-500 text-[11px] block mb-2">
                                SYS. ARCHIVE // EST. 2024
                            </span>
                            <a href="#" className="font-display text-2xl sm:text-3xl font-light tracking-wider text-white">
                                KALLAYI<span className="text-neutral-500">.</span> CAR SPA
                            </a>
                        </div>

                        <p className="text-sm text-neutral-400 leading-relaxed font-light max-w-sm">
                            Pinnacle vehicle preservation and aesthetic refinement. Operating at the intersection of precision engineering, state-of-the-art coatings, and luxury detailing.
                        </p>

                        {/* 6. Social Media Hover-Glow */}
                        <div className="flex items-center gap-5 pt-2">
                            {socialLinks.map((social) => {
                                const Icon = social.icon;
                                return (
                                    <a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.label}
                                        className="text-neutral-500 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-300 transform hover:-translate-y-0.5"
                                    >
                                        <Icon className="w-5 h-5" />
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Links Column (lg:col-span-2) */}
                    <div className="lg:col-span-2 space-y-4">
                        <span className="hud-label uppercase font-mono tracking-[0.25em] text-neutral-500 text-xs block">
                            SYS. NAV
                        </span>
                        <ul className="space-y-3 pt-2">
                            {navLinks.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        className="text-sm text-neutral-400 hover:text-white hover:translate-x-1 transition-all duration-300 flex items-center gap-1.5 font-light"
                                    >
                                        <span className="text-[10px] text-neutral-600 font-mono">›</span>
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Intel Column (lg:col-span-3) */}
                    <div className="lg:col-span-3 space-y-4">
                        <span className="hud-label uppercase font-mono tracking-[0.25em] text-neutral-500 text-xs block">
                            INTEL // CONTACT
                        </span>
                        <div className="space-y-3 pt-2 text-sm text-neutral-400 font-light leading-relaxed">
                            <div>
                                <span className="block text-[11px] font-mono text-neutral-500 uppercase tracking-widest">FACILITY</span>
                                <span>Vattapara-Pattarkulam Road, Manjeri, Kerala</span>
                            </div>
                            <div>
                                <span className="block text-[11px] font-mono text-neutral-500 uppercase tracking-widest">CONCIERGE</span>
                                <a href="tel:+918089735500" className="hover:text-white transition-colors block">+91 80897 35500</a>
                                <a href="mailto:kallayicarspa@gmail.com" className="hover:text-white transition-colors block">kallayicarspa@gmail.com</a>
                            </div>
                            <div>
                                <span className="block text-[11px] font-mono text-neutral-500 uppercase tracking-widest">HOURS</span>
                                <span>Mon – Sun: 07:00 AM - 06:30 PM     </span>
                            </div>
                        </div>
                    </div>

                    {/* Newsletter / SMS Terminal Column (lg:col-span-3) */}
                    <div className="lg:col-span-3 space-y-4">
                        <span className="hud-label uppercase font-mono tracking-[0.25em] text-neutral-500 text-xs block">
                            TERMINAL // SUBSCRIBE
                        </span>
                        <p className="text-sm text-neutral-400 font-light leading-relaxed">
                            Subscribe for private bay allocations, seasonal protection updates, and detailing intelligence.
                        </p>

                        {/* 5. Form Styling (Newsletter/SMS) */}
                        <form onSubmit={handleSubmit} className="pt-2 space-y-3">
                            <div className="relative flex items-center border-b border-white/30 focus-within:border-white transition-colors duration-300 py-1">
                                <input
                                    type="email"
                                    required
                                    placeholder="ENTER EMAIL ADDRESS..."
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-transparent border-none text-white outline-none placeholder:text-neutral-600 px-0 py-2 w-full text-xs font-mono tracking-wider"
                                />
                                <button
                                    type="submit"
                                    aria-label="Submit newsletter subscription"
                                    className="text-xs font-mono text-neutral-400 hover:text-white uppercase tracking-wider pl-3 transition-colors flex items-center gap-1.5 group shrink-0"
                                >
                                    <span className="hidden sm:inline">[ ENTER ]</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            {subscribed && (
                                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 pt-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>ACCESS GRANTED // REGISTRY CONFIRMED</span>
                                </div>
                            )}
                        </form>
                    </div>

                </div>

                {/* 7. Copyright Bar */}
                <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500 tracking-wider">
                    <div>
                        © {new Date().getFullYear()} SYS. ARCHIVE // KALLAYI CAR SPA. ALL RIGHTS RESERVED.
                    </div>
                    <div className="flex items-center gap-6 text-[11px]">
                        <a href="#" className="hover:text-neutral-300 transition-colors">PRIVACY POLICY</a>
                        <span className="text-neutral-700">//</span>
                        <a href="#" className="hover:text-neutral-300 transition-colors">TERMS OF SERVICE</a>
                        <span className="text-neutral-700">//</span>
                        <a href="#" className="hover:text-neutral-300 transition-colors">SYSTEM STATUS</a>
                    </div>
                </div>

            </div>
        </footer>
    );
}
