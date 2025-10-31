import React, { useEffect, useRef } from "react";
import "./Hero.css";

const Hero = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const visualRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let particles = [];
    const maxDistance = 200;
    const mouse = { x: null, y: null };

    const resizeCanvas = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.offsetWidth;
        canvas.height = containerRef.current.offsetHeight;
        init();
      }
    };

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 1.5;
        this.speedY = (Math.random() - 0.5) * 1.5;
        this.baseColor = `hsl(${Math.random() * 360}, 80%, 70%)`;
        this.opacity = Math.random() * 0.5 + 0.5;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas.width + this.size) this.x = -this.size;
        else if (this.x < -this.size) this.x = canvas.width + this.size;
        if (this.y > canvas.height + this.size) this.y = -this.size;
        else if (this.y < -this.size) this.y = canvas.height + this.size;
      }

      draw() {
        ctx.fillStyle = this.baseColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.baseColor;
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    }

    const init = () => {
      particles = [];
      const numberOfParticles = Math.min(
        Math.floor((canvas.width * canvas.height) / 10000),
        200
      );
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.strokeStyle = `hsla(210, 100%, 80%, ${0.5 - distance / (maxDistance * 2)
              })`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (visualRef.current && window.innerWidth >= 768) {
        const { clientX, clientY } = e;
        const rect = visualRef.current.getBoundingClientRect();
        const x =
          (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const y =
          (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        visualRef.current.style.transform = `translate3d(${x * 15}px, ${y * 15
          }px, 0) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
      }
    };

    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <section className="hero" ref={containerRef}>
      <canvas ref={canvasRef} className="hero-canvas"></canvas>

      <div className="hero-content">
        <h1 className="hero-title">
          <span className="text-reveal">Digitize Your</span>
          <span className="text-reveal">Finances, Instantly.</span>
        </h1>
        <p className="hero-subtitle">
          Turn scattered receipts into categorized reports and powerful
          insights with our AI-powered scanner. Simplify expense tracking and
          gain financial clarity.
        </p>
        <div className="hero-buttons">
          <button className="cta-btn magnetic">
            <span>Get Started</span>
            <div className="hover-effect"></div>
          </button>
          <button className="secondary-btn magnetic">
            <span>Learn More</span>
            <div className="hover-effect"></div>
          </button>
        </div>
      </div>

      <div className="hero-visual" ref={visualRef}>
        {/* Desktop & Tablet Animation */}
        <div className="visual-desktop">
          <div className="receipt-container">
            <div className="receipt-inner">
              <div className="receipt-content">
                <div className="receipt-line"></div>
                <div className="receipt-line w-80"></div>
                <div className="receipt-line w-60"></div>
                <div className="receipt-total"></div>
              </div>
            </div>
            <div className="scanner-line"></div>
          </div>

          <div className="report-card-container">
            <div className="report-card-visual">
              <div className="report-card-content">
                <div className="card-header">
                  <h3>Monthly Report</h3>
                  <p>October 2024</p>
                </div>
                <div className="chart-placeholder"></div>
                <div className="insights-list">
                  <div className="insight-item">
                    <div className="insight-icon icon-1"></div>
                    <div className="insight-text">Travel Expenses</div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-icon icon-2"></div>
                    <div className="insight-text">Food & Dining</div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-icon icon-3"></div>
                    <div className="insight-text">Utilities</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="visual-mobile">
          <div className="mobile-animation">
            <div className="flip-inner">
              {/* Receipt Side */}
              <div className="floating-receipt">
                <div className="mobile-scan-line"></div>
                <div className="floating-line"></div>
                <div className="floating-line w-70"></div>
                <div className="floating-line w-50"></div>
                <div className="floating-total"></div>
              </div>

              {/* Report Side */}
              <div className="floating-report">
                <div className="report-header">
                  <h4>Expense Report</h4>
                  <p>October 2024</p>
                </div>
                <div className="report-bar"></div>
                <div className="report-bar w-70"></div>
                <div className="report-bar w-50"></div>
                <div className="report-summary"></div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
};

export default Hero;
