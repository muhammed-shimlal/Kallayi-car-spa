'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface Review {
    id: number;
    quote: string;
    author: string;
    vehicle: string;
    rating: number;
}

const REVIEWS: Review[] = [
    {
        id: 1,
        quote: "Adipoli work! The attention to detail is unmatched. My paint hasn't looked this deep since it left the showroom.",
        author: "ARJUN V.",
        vehicle: "BMW 5 SERIES",
        rating: 5
    },
    {
        id: 2,
        quote: "Nalla service ayirunnu. The 3M undercoating was applied flawlessly. Oru cheriya delay indayirunnu, but totally worth it.",
        author: "FATHIMA S.",
        vehicle: "RANGE ROVER EVOQUE",
        rating: 4
    },
    {
        id: 3,
        quote: "ഗംഭീരം! The Ultimate 360 restored my interior completely. Highly recommended for premium cars in Calicut.",
        author: "VISHNU P.",
        vehicle: "MERCEDES-BENZ C-CLASS",
        rating: 5
    },
    {
        id: 4,
        quote: "Poli sanam! Premium service, zero friction. Vandi ippo puthiya pole und. Great job team.",
        author: "AJITH K.",
        vehicle: "AUDI A6",
        rating: 4
    },
    {
        id: 5,
        quote: "An absolute masterclass in automotive care. They treat the vehicle with the exact level of respect it deserves. Kidilan experience!",
        author: "MIDHUN T.",
        vehicle: "PORSCHE MACAN",
        rating: 5
    }
];

export default function TestimonialMarquee() {
    // Duplicate array to ensure a completely seamless, continuous loop without gaps
    const marqueeReviews = [...REVIEWS, ...REVIEWS, ...REVIEWS];

    return (
        <section className="relative w-full bg-[#050505] text-white py-20 sm:py-28 overflow-hidden border-t border-white/10">
            {/* Embedded CSS for smooth 60fps Infinite Marquee with Hover Pause */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes marquee-scroll {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-33.333%); }
                }
                .marquee-track {
                    display: flex;
                    width: max-content;
                    animation: marquee-scroll 35s linear infinite;
                }
                .marquee-track:hover {
                    animation-play-state: paused;
                }
            `}} />

            <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 mb-12 sm:mb-16">
                <span className="hud-label uppercase font-mono tracking-[0.3em] text-neutral-500 text-xs block mb-2">
                    SYS. LOG // CLIENT VERDICT
                </span>
                <h2 className="font-display text-3xl sm:text-5xl font-light tracking-tight uppercase text-white">
                    Continuous Telemetry
                </h2>
            </div>

            {/* Gradient Mask Container: Softly fades cards on left & right edges */}
            <div
                className="relative w-full overflow-hidden"
                style={{
                    maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)'
                }}
            >
                <div className="marquee-track flex gap-6 sm:gap-8 px-4">
                    {marqueeReviews.map((review, index) => (
                        <div
                            key={`${review.id}-${index}`}
                            className="w-[320px] sm:w-[400px] shrink-0 bg-white/[0.02] border border-white/5 hover:border-white/20 p-6 sm:p-8 rounded-2xl flex flex-col justify-between transition-colors duration-300 group"
                        >
                            <div>
                                {/* Dynamic Star Rating */}
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => {
                                        const isFilled = i < review.rating;
                                        return (
                                            <Star
                                                key={i}
                                                className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 ${
                                                    isFilled
                                                        ? 'fill-white text-white opacity-95'
                                                        : 'fill-transparent text-neutral-700 opacity-40'
                                                }`}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Quote */}
                                <p className="text-neutral-300 text-sm sm:text-base font-light leading-relaxed mb-8">
                                    "{review.quote}"
                                </p>
                            </div>

                            {/* Author Specification */}
                            <div className="pt-4 border-t border-white/5 text-xs font-mono tracking-[0.15em] uppercase">
                                <span className="text-white font-medium">{review.author}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

