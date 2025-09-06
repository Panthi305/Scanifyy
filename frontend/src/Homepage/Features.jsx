import React, { useEffect, useRef } from "react";
import "./Features.css";
import { FaCamera, FaRobot } from "react-icons/fa";
import { BsGraphUp } from "react-icons/bs";
import { FaFileAlt } from "react-icons/fa";

const Features = () => {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  const features = [
    { 
      icon: <FaCamera />, 
      title: "Smart Scanning", 
      desc: "Upload or snap a receipt, instantly digitized with advanced OCR technology.",
      color: "#06b6d4",
      gradient: "linear-gradient(135deg, #06b6d4, #0ea5e9)"
    },
    { 
      icon: <FaRobot />, 
      title: "AI Categorization", 
      desc: "Expenses auto-sorted into intelligent categories with machine learning.",
      color: "#8b5cf6",
      gradient: "linear-gradient(135deg, #8b5cf6, #a855f7)"
    },
    { 
      icon: <BsGraphUp />, 
      title: "Visual Reports", 
      desc: "Get beautiful insights with interactive charts & spending trends.",
      color: "#10b981",
      gradient: "linear-gradient(135deg, #10b981, #22c55e)"
    },
    { 
      icon: <FaFileAlt />, 
      title: "Export Reports", 
      desc: "Download detailed expense reports in PDF/CSV formats instantly.",
      color: "#f59e0b",
      gradient: "linear-gradient(135deg, #f59e0b, #f97316)"
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            
            // Animate each feature card with a staggered delay
            const cards = cardsRef.current;
            cards.forEach((card, index) => {
              if (card) {
                setTimeout(() => {
                  card.classList.add('animate-in');
                }, index * 150);
              }
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  // Mouse move parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll('.feature-card-3d');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const angleY = (x - centerX) / 25;
        const angleX = (centerY - y) / 25;
        
        card.style.transform = `
          perspective(1000px) 
          rotateX(${angleX}deg) 
          rotateY(${angleY}deg)
          translateZ(10px)
        `;
        
        // Glow effect
        const glow = card.querySelector('.feature-glow');
        if (glow) {
          glow.style.opacity = '0.3';
          glow.style.left = `${x - 100}px`;
          glow.style.top = `${y - 100}px`;
        }
      });
    };

    const handleMouseLeave = () => {
      const cards = document.querySelectorAll('.feature-card-3d');
      cards.forEach(card => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        
        const glow = card.querySelector('.feature-glow');
        if (glow) {
          glow.style.opacity = '0';
        }
      });
    };

    const section = sectionRef.current;
    if (section) {
      section.addEventListener('mousemove', handleMouseMove);
      section.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (section) {
        section.removeEventListener('mousemove', handleMouseMove);
        section.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <section className="features" ref={sectionRef}>
      <div className="features-background">
        <div className="features-orbit"></div>
        <div className="features-orbit features-orbit-2"></div>
        <div className="features-orbit features-orbit-3"></div>
        <div className="floating-particles">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="particle" style={{
              '--size': `${Math.random() * 6 + 2}px`,
              '--delay': `${Math.random() * 5}s`,
              '--duration': `${Math.random() * 15 + 10}s`,
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`,
            }}></div>
          ))}
        </div>
      </div>
      
      <div className="features-content">
        <div className="features-header">
          <h2 className="features-title">
            <span className="title-line">Powerful Features</span>
          </h2>
          <p className="features-subtitle">
            Our AI-powered platform transforms how you manage receipts and expenses, 
            saving time and providing valuable financial insights.
          </p>
        </div>
        
        <div className="features-grid">
          {features.map((f, i) => (
            <div 
              key={i} 
              className="feature-card-3d"
              ref={el => cardsRef.current[i] = el}
              style={{ '--accent-color': f.color, '--gradient': f.gradient }}
            >
              <div className="feature-glow"></div>
              <div className="feature-card-inner">
                <div className="feature-icon">
                  <div className="icon-wrapper">
                    {f.icon}
                  </div>
                  <div className="icon-backdrop"></div>
                  <div className="icon-orbits">
                    <div className="icon-orbit"></div>
                    <div className="icon-orbit"></div>
                  </div>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {/* <div className="feature-hover-indicator"></div> */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;