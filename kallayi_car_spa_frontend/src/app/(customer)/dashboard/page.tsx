"use client";

import React, { useEffect, useRef, useState, MouseEvent } from "react";
import styles from "./page.module.css";
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "700"] });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["300", "700", "900"] });

export default function CinematicCustomerDashboard() {
  const [activeBg, setActiveBg] = useState<"bg-0" | "bg-1" | "bg-2">("bg-0");
  
  // Film strip dragging state
  const filmStripRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Intersection Observer for scroll reveal
  useEffect(() => {
    const revealElements = document.querySelectorAll(`.${styles.revealUp}`);
    if (revealElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.active);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Magnetic Physics Handler
  const handleMagneticMove = (e: MouseEvent<HTMLElement>) => {
    const currentTarget = e.currentTarget as HTMLElement;
    const position = currentTarget.getBoundingClientRect();
    const x = e.clientX - position.left - position.width / 2;
    const y = e.clientY - position.top - position.height / 2;
    currentTarget.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
  };

  const handleMagneticLeave = (e: MouseEvent<HTMLElement>) => {
    const currentTarget = e.currentTarget as HTMLElement;
    currentTarget.style.transform = "translate(0px, 0px)";
  };

  // Film Strip Drag Handlers
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!filmStripRef.current) return;
    setIsDown(true);
    filmStripRef.current.style.cursor = "grabbing";
    setStartX(e.pageX - filmStripRef.current.offsetLeft);
    setScrollLeft(filmStripRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    if (!filmStripRef.current) return;
    setIsDown(false);
    filmStripRef.current.style.cursor = "grab";
  };

  const handleMouseUp = () => {
    if (!filmStripRef.current) return;
    setIsDown(false);
    filmStripRef.current.style.cursor = "grab";
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDown || !filmStripRef.current) return;
    e.preventDefault();
    const x = e.pageX - filmStripRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    filmStripRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className={`${styles.container} ${inter.className}`}>
      
      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <a href="#" className={`${styles.logo} ${spaceGrotesk.className} ${styles.fontDisplay}`}>
          KALLAYI<span>.</span>
        </a>
        <div 
          className={styles.menuBtn}
          onMouseMove={handleMagneticMove}
          onMouseLeave={handleMagneticLeave}
        >
          <div className={styles.line}></div>
          <div className={styles.line}></div>
        </div>
      </nav>

      {/* SECTION 1: HERO */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackground}></div>
        <div className={styles.vignetteOverlay}></div>
        <h1 className={`${styles.ghostText} ${spaceGrotesk.className} ${styles.fontDisplay}`}>
          KALLAYI
        </h1>
        
        <div className={styles.heroContent}>
          <span className={`${styles.hudLabel} ${styles.uppercase}`}>SYS. ONLINE // VEHICLE SPA</span>
          <button 
            className={`${styles.bookBtn} ${spaceGrotesk.className} ${styles.fontDisplay}`}
            onMouseMove={handleMagneticMove}
            onMouseLeave={handleMagneticLeave}
          >
            BOOK
            <span className={styles.btnLine}></span>
          </button>
        </div>

        <div className={styles.scrollIndicator}>
          <span className={`${styles.scrollText} ${spaceGrotesk.className} ${styles.fontDisplay}`}>SCROLL</span>
          <div className={styles.scrollLineContainer}>
            <div className={styles.scrollLine}></div>
          </div>
        </div>
      </section>

      {/* SECTION 2: ARSENAL */}
      <section className={styles.arsenalSection} id="services">
        <div 
          className={`${styles.arsenalBg} ${activeBg === "bg-0" ? styles.active : ""}`} 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=2000&auto=format&fit=crop')" }}
        />
        <div 
          className={`${styles.arsenalBg} ${activeBg === "bg-1" ? styles.active : ""}`} 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2000&auto=format&fit=crop')" }}
        />
        <div 
          className={`${styles.arsenalBg} ${activeBg === "bg-2" ? styles.active : ""}`} 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1552930294-6b595f4c2974?q=80&w=2000&auto=format&fit=crop')" }}
        />
        
        <div 
          className={styles.vignetteOverlay} 
          style={{ background: "radial-gradient(circle, rgba(5,5,5,0.4) 30%, rgba(5,5,5,0.95) 100%)" }}
        />

        <div className={styles.arsenalContent}>
          <span className={`${styles.hudLabel} ${styles.uppercase} ${styles.revealUp}`}>SYS. ARCHIVE // SELECT SERVICE</span>
          <div className={styles.servicesList}>
            <div 
              className={`${styles.serviceItem} ${styles.revealUp}`} 
              onMouseEnter={() => setActiveBg("bg-0")}
            >
              <span className={`${styles.serviceNum} ${spaceGrotesk.className} ${styles.fontDisplay}`}>01</span>
              <h2 className={`${styles.serviceTitle} ${spaceGrotesk.className} ${styles.fontDisplay}`}>CAR WASH</h2>
              <span className={`${styles.serviceArrow} ${spaceGrotesk.className} ${styles.fontDisplay}`}>→</span>
            </div>
            <div 
              className={`${styles.serviceItem} ${styles.revealUp}`} 
              onMouseEnter={() => setActiveBg("bg-1")} 
              style={{ transitionDelay: '0.1s' }}
            >
              <span className={`${styles.serviceNum} ${spaceGrotesk.className} ${styles.fontDisplay}`}>02</span>
              <h2 className={`${styles.serviceTitle} ${spaceGrotesk.className} ${styles.fontDisplay}`}>DETAILING</h2>
              <span className={`${styles.serviceArrow} ${spaceGrotesk.className} ${styles.fontDisplay}`}>→</span>
            </div>
            <div 
              className={`${styles.serviceItem} ${styles.revealUp}`} 
              onMouseEnter={() => setActiveBg("bg-2")} 
              style={{ transitionDelay: '0.2s' }}
            >
              <span className={`${styles.serviceNum} ${spaceGrotesk.className} ${styles.fontDisplay}`}>03</span>
              <h2 className={`${styles.serviceTitle} ${spaceGrotesk.className} ${styles.fontDisplay}`}>UNLIMITED</h2>
              <span className={`${styles.serviceArrow} ${spaceGrotesk.className} ${styles.fontDisplay}`}>→</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: VERDICT */}
      <section className={styles.verdictSection} id="reviews">
        <div className={`${styles.verdictHeader} ${styles.revealUp}`}>
          <span className={`${styles.hudLabel} ${styles.uppercase}`}>SYS. LOG // CLIENT VERDICT</span>
          <h2 className={`${styles.verdictTitle} ${spaceGrotesk.className} ${styles.fontDisplay} ${styles.uppercase}`}>The Verdict</h2>
        </div>

        <div 
          className={`${styles.filmStrip} ${styles.revealUp}`} 
          style={{ transitionDelay: '0.2s', cursor: isDown ? 'grabbing' : 'grab' }}
          ref={filmStripRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {/* Review 1 */}
          <div className={styles.reviewCard}>
            <div className={styles.telemetryMeta}>
              <span>ID: Kallayi Car Spa</span>
              <span>LOG: 20.09.2024</span>
            </div>
            <div className={styles.reviewerInfo}>
              <div className={`${styles.neonAvatar} ${styles.neonSlate} ${spaceGrotesk.className} ${styles.fontDisplay}`}>MB</div>
              <h3 className={`${styles.reviewerName} ${spaceGrotesk.className} ${styles.fontDisplay}`}>Michael Brown</h3>
            </div>
            <p className={styles.reviewText}>"Great service! Very pleased with the result. After washing, the car looks like new, shiny and without a single stain. Fast and quality service, pleasant staff. I will definitely come back!"</p>
          </div>

          {/* Review 2 */}
          <div className={styles.reviewCard}>
            <div className={styles.telemetryMeta}>
              <span>ID: Kallayi Car Spa</span>
              <span>LOG: 20.09.2024</span>
            </div>
            <div className={styles.reviewerInfo}>
              <div className={`${styles.neonAvatar} ${styles.neonEmerald} ${spaceGrotesk.className} ${styles.fontDisplay}`}>EJ</div>
              <h3 className={`${styles.reviewerName} ${spaceGrotesk.className} ${styles.fontDisplay}`}>Emily Jonson</h3>
            </div>
            <p className={styles.reviewText}>"Detailing at the highest level! Used the service of full interior cleaning and exterior washing. All small details have been cleaned thoroughly, the interior smells fresh. Very professional work!"</p>
          </div>

          {/* Review 3 */}
          <div className={styles.reviewCard}>
            <div className={styles.telemetryMeta}>
              <span>ID: Kallayi Car Spa</span>
              <span>LOG: 20.09.2024</span>
            </div>
            <div className={styles.reviewerInfo}>
              <div className={`${styles.neonAvatar} ${styles.neonOrange} ${spaceGrotesk.className} ${styles.fontDisplay}`}>JM</div>
              <h3 className={`${styles.reviewerName} ${spaceGrotesk.className} ${styles.fontDisplay}`}>James Miller</h3>
            </div>
            <p className={styles.reviewText}>"Extremely fast and high-quality. I liked how quickly they got the job done. Even heavy dirt on the wheels was completely removed. I recommend this car wash to everyone!"</p>
          </div>

          {/* Review 4 */}
          <div className={styles.reviewCard}>
            <div className={styles.telemetryMeta}>
              <span>ID: Kallayi Car Spa</span>
              <span>LOG: 18.09.2024</span>
            </div>
            <div className={styles.reviewerInfo}>
              <div className={`${styles.neonAvatar} ${styles.neonBlue} ${spaceGrotesk.className} ${styles.fontDisplay}`}>AS</div>
              <h3 className={`${styles.reviewerName} ${spaceGrotesk.className} ${styles.fontDisplay}`}>Anna Smith</h3>
            </div>
            <p className={styles.reviewText}>"The best car wash in town. I've tried several different washers, but this one is the best. The equipment is modern, the staff is attentive to details."</p>
          </div>

        </div>
      </section>

    </div>
  );
}
