import React, { useEffect, useRef } from "react";
import "./HowItWorks.css";
import { FaUpload, FaSearch, FaChartBar } from "react-icons/fa";

const HowItWorks = () => {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  const steps = [
    { 
      icon: <FaUpload />, 
      title: "Upload Receipt", 
      desc: "Snap or upload a receipt directly from your device. It's fast, easy, and secure.",
      color: "#3b82f6",
      gradient: "linear-gradient(135deg, #3b82f6, #0ea5e9)"
    },
    { 
      icon: <FaSearch />, 
      title: "AI Scans & Categorizes", 
      desc: "Our AI-powered OCR extracts details and auto-sorts your expenses instantly.",
      color: "#8b5cf6",
      gradient: "linear-gradient(135deg, #8b5cf6, #a855f7)"
    },
    { 
      icon: <FaChartBar />, 
      title: "Get Instant Insights", 
      desc: "Receive visual dashboards and smart insights to track your spending effortlessly.",
      color: "#10b981",
      gradient: "linear-gradient(135deg, #10b981, #22c55e)"
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            cardsRef.current.forEach((card, index) => {
              if (card) {
                setTimeout(() => {
                  card.classList.add('animate-in');
                }, index * 200);
              }
            });
            observer.unobserve(entry.target);
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

  useEffect(() => {
    const handleMouseMove = (e) => {
      const section = sectionRef.current;
      if (!section) return;
      const { clientX, clientY } = e;
      const { left, top, width, height } = section.getBoundingClientRect();
      const x = (clientX - left) / width;
      const y = (clientY - top) / height;

      // Update CSS variables for the background glow effect
      section.style.setProperty('--mouse-x', `${clientX}px`);
      section.style.setProperty('--mouse-y', `${clientY}px`);
      
      // Calculate rotation for the 3D card tilt effect
      const rotateX = (y - 0.5) * -10; // Reduced tilt for a more subtle effect
      const rotateY = (x - 0.5) * 10;
      
      cardsRef.current.forEach(card => {
        if(card) {
          card.style.transform = `
            perspective(1000px) 
            rotateX(${rotateX}deg) 
            rotateY(${rotateY}deg)
            translateY(0) scale(1)
          `;
        }
      });
    };

    const handleMouseLeave = () => {
      // Reset card transform smoothly on mouse leave
      cardsRef.current.forEach(card => {
        if(card) {
          card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)';
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
    <section className="howitworks" ref={sectionRef}>
      <div className="howitworks-background"></div>
      
      <div className="howitworks-content">
        <div className="howitworks-header">
          <h2 className="howitworks-title">
            How It Works
          </h2>
          <p className="howitworks-subtitle">
            Transform your receipt management in three simple steps with our AI-powered platform.
          </p>
        </div>
        
        <div className="steps">
          {steps.map((s, i) => (
            <div 
              key={i} 
              className="step-card"
              ref={el => cardsRef.current[i] = el}
              style={{ '--accent-color': s.color, '--gradient': s.gradient }}
              data-step-number={i + 1}
            >
              <div className="step-card-inner">
                <div className="step-icon">
                  <div className="step-icon-wrapper">
                    {s.icon}
                  </div>
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;