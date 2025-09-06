import React, { useEffect, useRef } from "react";
import "./DashboardPreview.css";

const DashboardPreview = () => {
  const mockupRef = useRef(null);

  useEffect(() => {
    const card = mockupRef.current;
    if (!card) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Adjust rotation sensitivity
      const rotateX = ((y - centerY) / 30) * -1;
      const rotateY = (x - centerX) / 30;

      // Calculate parallax offset for layers
      const parallaxX = (x - centerX) / 50;
      const parallaxY = (y - centerY) / 50;

      const cardBackgroundX = (x / rect.width) * 100;
      const cardBackgroundY = (y / rect.height) * 100;

      // Apply 3D transform to the entire container
      card.style.transform = `perspective(2000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;

      // Pass mouse position to CSS variables for other effects
      card.style.setProperty("--mouse-x", `${cardBackgroundX}%`);
      card.style.setProperty("--mouse-y", `${cardBackgroundY}%`);

      // Pass parallax values to CSS variables for layered movement
      card.style.setProperty("--parallax-x", `${parallaxX}px`);
      card.style.setProperty("--parallax-y", `${parallaxY}px`);
    };

    const reset = () => {
      card.style.transform = "perspective(2000px) rotateX(0) rotateY(0) scale(1)";
      // Reset parallax values
      card.style.setProperty("--parallax-x", `0px`);
      card.style.setProperty("--parallax-y", `0px`);
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", reset);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", reset);
    };
  }, []);

  return (
    <section className="dashboard-preview">
      <div className="preview-content">
        <div className="preview-text">
          <h2 className="reveal-left">Visualize Your Finances in a Whole New Dimension</h2>
          <p className="reveal-left delay">
            Turn your raw financial data into captivating and powerful visual insights. Track spending,
            analyze trends, and effortlessly generate reports with our intuitive, real-time dashboard.
          </p>
        </div>
        <div className="preview-visual reveal-right">
          <div ref={mockupRef} className="dashboard-mockup">
            <div className="mockup-shimmer"></div>
            {/* The base layer for background effects and glow */}
            <div className="mockup-base">
              <div className="mockup-glow"></div>
            </div>
            {/* The main content layer where your image will be */}
            <div className="mockup-content">
              <div className="placeholder-image">
                {/* 🖼️ Replace the div below with your image tag */}
                <img src="data:image/webp;base64,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" alt="Dashboard" className="dashboard-image" />
                {/* For example: <img src="/images/your-dashboard.png" alt="Dashboard" className="dashboard-image" /> */}
                {/* <p>Your Dashboard Image Here</p> */}
              </div>
            </div>
            {/* A top frame for extra depth */}
            <div className="mockup-frame"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;