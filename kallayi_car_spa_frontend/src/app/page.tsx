'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import { useRouter } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '700'] });

export default function CustomerCinematicPage() {
    const router = useRouter();
    const [activeBg, setActiveBg] = useState('bg-0');
    
    // Drag-to-scroll state for the film strip
    const filmStripRef = useRef<HTMLDivElement>(null);
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // --- LOGIC: Handle Button Clicks & Auth ---
    const handleBookingClick = () => {
        // Only run on the client side
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token');
            if (token) {
                // User is logged in -> Send to the actual Customer Dashboard
                router.push('/customer/dashboard');
            } else {
                // User is NOT logged in -> Send to Login Page
                router.push('/login');
            }
        }
    };

    // Magnetic Button Physics
    const handleMagneticMove = (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
        const btn = e.currentTarget;
        const position = btn.getBoundingClientRect();
        const x = e.clientX - position.left - position.width / 2;
        const y = e.clientY - position.top - position.height / 2;
        btn.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
    };

    const handleMagneticLeave = (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translate(0px, 0px)';
    };

    // Scroll Reveal Observer
    useEffect(() => {
        const revealElements = document.querySelectorAll('.reveal-up');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.1 }); 
        
        revealElements.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    // Film Strip Drag Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDown(true);
        if (filmStripRef.current) {
            filmStripRef.current.style.cursor = 'grabbing';
            setStartX(e.pageX - filmStripRef.current.offsetLeft);
            setScrollLeft(filmStripRef.current.scrollLeft);
        }
    };
    const handleMouseLeave = () => { setIsDown(false); if (filmStripRef.current) filmStripRef.current.style.cursor = 'grab'; };
    const handleMouseUp = () => { setIsDown(false); if (filmStripRef.current) filmStripRef.current.style.cursor = 'grab'; };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDown || !filmStripRef.current) return;
        e.preventDefault();
        const x = e.pageX - filmStripRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        filmStripRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className={`${inter.className} page-wrapper`}>
            {/* INJECTING EXACT CUSTOM CSS TO PREVENT TAILWIND OVERRIDES */}
            <style dangerouslySetInnerHTML={{ __html: `
                .page-wrapper {
                    --bg-vantablack: #050505;
                    --surface-glass: rgba(18, 18, 18, 0.6);
                    --accent-red: #E52323;
                    --text-pure: #FFFFFF;
                    --text-muted: #94A3B8;
                    --ease-cinematic: cubic-bezier(0.77, 0, 0.175, 1);
                    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
                    background-color: var(--bg-vantablack);
                    color: var(--text-pure);
                    overflow-x: hidden;
                }
                .font-display { font-family: ${spaceGrotesk.style.fontFamily}, sans-serif; }
                .uppercase { text-transform: uppercase; }

                .vignette-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: radial-gradient(circle, rgba(5,5,5,0) 30%, rgba(5,5,5,0.95) 100%);
                    z-index: 1; pointer-events: none;
                }
                
                .hud-label { font-size: 11px; font-weight: 700; letter-spacing: 0.3em; color: var(--text-muted); display: block; }
                .reveal-up { opacity: 0; transform: translateY(60px); transition: all 1.2s var(--ease-cinematic); }
                .reveal-up.active { opacity: 1; transform: translateY(0); }

                /* HERO */
                .hero-section { position: relative; height: 100vh; width: 100%; overflow: hidden; }
                .hero-background {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background-image: url('https://images.unsplash.com/photo-1614200187524-dc4b892acf16?q=80&w=2500&auto=format&fit=crop');
                    background-size: cover; background-position: center;
                    opacity: 0.5; z-index: 0; animation: breathe 15s linear infinite alternate;
                }
                .ghost-text {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    font-size: 22vw; font-weight: 900; letter-spacing: -0.05em;
                    color: rgba(255, 255, 255, 0.04); white-space: nowrap; z-index: 2; pointer-events: none; user-select: none;
                    animation: fadeUp 2s var(--ease-out) forwards;
                }
                .navbar {
                    position: fixed; top: 0; left: 0; width: 100%; padding: 40px 60px;
                    display: flex; justify-content: space-between; align-items: center;
                    z-index: 100; opacity: 0; animation: fadeDown 1.5s var(--ease-out) 0.5s forwards;
                    background: linear-gradient(to bottom, rgba(5,5,5,0.8) 0%, rgba(5,5,5,0) 100%);
                }
                .logo { font-size: 24px; font-weight: 700; letter-spacing: 0.2em; text-decoration: none; color: white; cursor: pointer; }
                .logo span { color: var(--accent-red); }
                .menu-btn { display: flex; flex-direction: column; gap: 6px; cursor: pointer; padding: 20px; transition: transform 0.3s var(--ease-out); }
                .menu-btn .line { width: 30px; height: 2px; background: var(--text-pure); transition: width 0.3s ease; }
                .menu-btn .line:nth-child(2) { width: 20px; }
                .menu-btn:hover .line:nth-child(2) { width: 30px; }
                .hero-content {
                    position: absolute; bottom: 120px; left: 60px; z-index: 10; opacity: 0;
                    animation: fadeUpLeft 1.5s var(--ease-out) 0.8s forwards;
                }
                .book-btn {
                    background: none; border: none; color: var(--text-pure);
                    font-size: 80px; font-weight: 700; line-height: 1; cursor: pointer;
                    position: relative; display: flex; flex-direction: column; align-items: flex-start;
                    transition: transform 0.3s var(--ease-out); margin-top: 20px;
                }
                .btn-line {
                    height: 4px; width: 40px; background-color: var(--accent-red);
                    margin-top: 10px; transition: width 0.5s var(--ease-cinematic);
                }
                .book-btn:hover .btn-line { width: 100%; }
                .scroll-indicator {
                    position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
                    display: flex; flex-direction: column; align-items: center; gap: 16px;
                    z-index: 10; opacity: 0; animation: fadeIn 2s ease 1.5s forwards;
                }
                .scroll-text { font-size: 10px; font-weight: 700; letter-spacing: 0.4em; color: var(--text-muted); }
                .scroll-line-container { width: 2px; height: 60px; background-color: rgba(255, 255, 255, 0.1); overflow: hidden; position: relative; }
                .scroll-line { width: 100%; height: 100%; background-color: var(--accent-red); animation: scrollWhip 2s var(--ease-cinematic) infinite; }

                /* ARSENAL */
                .arsenal-section {
                    position: relative; min-height: 100vh; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    padding: 120px 60px; background-color: var(--bg-vantablack);
                }
                .arsenal-bg {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background-size: cover; background-position: center;
                    opacity: 0; transition: opacity 0.8s var(--ease-cinematic), transform 10s linear; z-index: 0; transform: scale(1.02);
                }
                .arsenal-bg.active { opacity: 0.4; transform: scale(1.05); }
                .arsenal-content { position: relative; z-index: 10; width: 100%; max-width: 1400px; }
                .services-list { display: flex; flex-direction: column; margin-top: 60px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
                .service-item {
                    display: flex; align-items: center; padding: 50px 40px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer;
                    transition: all 0.5s var(--ease-cinematic); position: relative; overflow: hidden;
                }
                .service-num { font-size: 24px; color: var(--text-muted); width: 100px; transition: color 0.3s ease; }
                .service-title { font-size: 6vw; font-weight: 700; line-height: 1; letter-spacing: -0.02em; color: var(--text-pure); transition: transform 0.5s var(--ease-cinematic); }
                .service-arrow { margin-left: auto; font-size: 40px; color: var(--accent-red); opacity: 0; transform: translateX(-20px); transition: all 0.5s var(--ease-cinematic); }
                .service-item:hover { background: var(--surface-glass); backdrop-filter: blur(16px); border-bottom-color: var(--accent-red); }
                .service-item:hover .service-title { transform: translateX(40px); }
                .service-item:hover .service-num { color: var(--accent-red); }
                .service-item:hover .service-arrow { opacity: 1; transform: translateX(0); }

                /* VERDICT */
                .verdict-section {
                    position: relative; min-height: 100vh; width: 100%;
                    padding: 120px 0 120px 60px;
                    background-color: var(--bg-vantablack);
                    display: flex; flex-direction: column; justify-content: center;
                }
                .verdict-header { max-width: 1400px; margin-bottom: 80px; padding-right: 60px; }
                .verdict-title { font-size: 5vw; font-weight: 700; line-height: 1; letter-spacing: -0.02em; margin-top: 20px; }
                .film-strip {
                    display: flex; gap: 40px; overflow-x: auto; padding-bottom: 60px; padding-right: 60px;
                    -ms-overflow-style: none; scrollbar-width: none; scroll-snap-type: x mandatory; cursor: grab;
                }
                .film-strip::-webkit-scrollbar { display: none; }
                .review-card {
                    min-width: 450px; background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05); padding: 50px;
                    scroll-snap-align: start; transition: all 0.4s var(--ease-out); position: relative;
                }
                .review-card:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.2); transform: translateY(-10px); }
                .telemetry-meta {
                    font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.3em;
                    text-transform: uppercase; margin-bottom: 40px; display: flex; justify-content: space-between;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 15px;
                }
                .reviewer-info { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
                .neon-avatar {
                    font-size: 20px; font-weight: 700; width: 60px; height: 60px;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 50%; border: 1px solid; background: var(--bg-vantablack);
                }
                .neon-slate { color: #CBD5E1; border-color: #CBD5E1; box-shadow: 0 0 15px rgba(203, 213, 225, 0.2); }
                .neon-emerald { color: #10B981; border-color: #10B981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); }
                .neon-orange { color: #F97316; border-color: #F97316; box-shadow: 0 0 15px rgba(249, 115, 22, 0.3); }
                .neon-blue { color: #3B82F6; border-color: #3B82F6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); }
                .reviewer-name { font-size: 24px; font-weight: 700; }
                .review-text { font-size: 16px; line-height: 1.8; color: #E2E8F0; }

                /* ANIMATIONS */
                @keyframes fadeUp { 0% { opacity: 0; transform: translateY(40px) translateX(-50%); } 100% { opacity: 1; transform: translateY(-50%) translateX(-50%); } }
                @keyframes fadeUpLeft { 0% { opacity: 0; transform: translateY(40px); } 100% { opacity: 1; transform: translateY(0); } }
                @keyframes fadeDown { 0% { opacity: 0; transform: translateY(-40px); } 100% { opacity: 1; transform: translateY(0); } }
                @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
                @keyframes scrollWhip { 0% { transform: translateY(-100%); } 50% { transform: translateY(0); } 100% { transform: translateY(100%); } }
                @keyframes breathe { 0% { transform: scale(1); } 100% { transform: scale(1.05); } }

                @media (max-width: 768px) {
                    .navbar { padding: 20px; }
                    .hero-content { left: 20px; bottom: 80px; }
                    .book-btn { font-size: 50px; }
                    .ghost-text { font-size: 28vw; }
                    .arsenal-section { padding: 100px 20px; }
                    .service-title { font-size: 10vw; }
                    .service-item { padding: 30px 10px; }
                    .verdict-section { padding: 100px 0 100px 20px; }
                    .review-card { min-width: 320px; padding: 30px; }
                }
            `}} />

            {/* --- NAVBAR --- */}
            <nav className="navbar">
                <a onClick={handleBookingClick} className="logo font-display">KALLAYI<span>.</span></a>
                <div 
                    className="menu-btn magnetic" 
                    onMouseMove={handleMagneticMove} 
                    onMouseLeave={handleMagneticLeave}
                    onClick={() => router.push('/login')} // Easy way to hit login
                >
                    <div className="line"></div>
                    <div className="line"></div>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="hero-section">
                <div className="hero-background"></div>
                <div className="vignette-overlay"></div>
                <h1 className="ghost-text font-display">KALLAYI</h1>
                
                <div className="hero-content">
                    <span className="hud-label uppercase">SYS. ONLINE // VEHICLE SPA</span>
                    <button 
                        onClick={handleBookingClick} // Triggers routing logic
                        className="book-btn font-display magnetic"
                        onMouseMove={handleMagneticMove} 
                        onMouseLeave={handleMagneticLeave}
                    >
                        BOOK
                        <span className="btn-line"></span>
                    </button>
                </div>

                <div className="scroll-indicator">
                    <span className="scroll-text font-display">SCROLL</span>
                    <div className="scroll-line-container">
                        <div className="scroll-line"></div>
                    </div>
                </div>
            </section>

            {/* --- ARSENAL SECTION --- */}
            <section className="arsenal-section" id="services">
                <div className={`arsenal-bg ${activeBg === 'bg-0' ? 'active' : ''}`} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=2000&auto=format&fit=crop')" }}></div>
                <div className={`arsenal-bg ${activeBg === 'bg-1' ? 'active' : ''}`} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2000&auto=format&fit=crop')" }}></div>
                <div className={`arsenal-bg ${activeBg === 'bg-2' ? 'active' : ''}`} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1552930294-6b595f4c2974?q=80&w=2000&auto=format&fit=crop')" }}></div>
                
                <div className="vignette-overlay" style={{ background: 'radial-gradient(circle, rgba(5,5,5,0.4) 30%, rgba(5,5,5,0.95) 100%)' }}></div>

                <div className="arsenal-content">
                    <span className="hud-label uppercase reveal-up">SYS. ARCHIVE // SELECT SERVICE</span>
                    <div className="services-list">
                        <div className="service-item reveal-up" onMouseEnter={() => setActiveBg('bg-0')} onClick={handleBookingClick}>
                            <span className="service-num font-display">01</span>
                            <h2 className="service-title font-display">CAR WASH</h2>
                            <span className="service-arrow font-display">→</span>
                        </div>
                        <div className="service-item reveal-up" style={{ transitionDelay: '0.1s' }} onMouseEnter={() => setActiveBg('bg-1')} onClick={handleBookingClick}>
                            <span className="service-num font-display">02</span>
                            <h2 className="service-title font-display">DETAILING</h2>
                            <span className="service-arrow font-display">→</span>
                        </div>
                        <div className="service-item reveal-up" style={{ transitionDelay: '0.2s' }} onMouseEnter={() => setActiveBg('bg-2')} onClick={handleBookingClick}>
                            <span className="service-num font-display">03</span>
                            <h2 className="service-title font-display">UNLIMITED</h2>
                            <span className="service-arrow font-display">→</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- VERDICT SECTION --- */}
            <section className="verdict-section" id="reviews">
                <div className="verdict-header reveal-up">
                    <span className="hud-label uppercase">SYS. LOG // CLIENT VERDICT</span>
                    <h2 className="verdict-title font-display uppercase">The Verdict</h2>
                </div>

                <div 
                    className="film-strip reveal-up" 
                    style={{ transitionDelay: '0.2s' }}
                    ref={filmStripRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    <div className="review-card">
                        <div className="telemetry-meta">
                            <span>ID: Kallayi Car Spa</span>
                            <span>LOG: 20.09.2024</span>
                        </div>
                        <div className="reviewer-info">
                            <div className="neon-avatar neon-slate font-display">MB</div>
                            <h3 className="reviewer-name font-display">Michael Brown</h3>
                        </div>
                        <p className="review-text">"Great service! Very pleased with the result. After washing, the car looks like new, shiny and without a single stain. Fast and quality service, pleasant staff. I will definitely come back!"</p>
                    </div>

                    <div className="review-card">
                        <div className="telemetry-meta">
                            <span>ID: Kallayi Car Spa</span>
                            <span>LOG: 20.09.2024</span>
                        </div>
                        <div className="reviewer-info">
                            <div className="neon-avatar neon-emerald font-display">EJ</div>
                            <h3 className="reviewer-name font-display">Emily Jonson</h3>
                        </div>
                        <p className="review-text">"Detailing at the highest level! Used the service of full interior cleaning and exterior washing. All small details have been cleaned thoroughly, the interior smells fresh. Very professional work!"</p>
                    </div>

                    <div className="review-card">
                        <div className="telemetry-meta">
                            <span>ID: Kallayi Car Spa</span>
                            <span>LOG: 20.09.2024</span>
                        </div>
                        <div className="reviewer-info">
                            <div className="neon-avatar neon-orange font-display">JM</div>
                            <h3 className="reviewer-name font-display">James Miller</h3>
                        </div>
                        <p className="review-text">"Extremely fast and high-quality. I liked how quickly they got the job done. Even heavy dirt on the wheels was completely removed. I recommend this car wash to everyone!"</p>
                    </div>

                    <div className="review-card">
                        <div className="telemetry-meta">
                            <span>ID: Kallayi Car Spa</span>
                            <span>LOG: 18.09.2024</span>
                        </div>
                        <div className="reviewer-info">
                            <div className="neon-avatar neon-blue font-display">AS</div>
                            <h3 className="reviewer-name font-display">Anna Smith</h3>
                        </div>
                        <p className="review-text">"The best car wash in town. I've tried several different washers, but this one is the best. The equipment is modern, the staff is attentive to details."</p>
                    </div>
                </div>
            </section>
        </div>
    );
}