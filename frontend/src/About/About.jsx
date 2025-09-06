import React, { useState, useEffect } from "react";
import { FaRocket, FaUsers, FaChartLine, FaAward, FaCalendarAlt, FaArrowRight } from "react-icons/fa";
import "./About.css";

const About = () => {
  const [visibleSections, setVisibleSections] = useState([]);

  useEffect(() => {
    // Create particle network
    const particleNetwork = document.querySelector('.particle-network');
    if (particleNetwork) { 
      // Create particles
      for (let i = 0; i < 80; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 4}s`;
        particleNetwork.appendChild(particle);
      }
      
      // Create connections between particles
      const particles = particleNetwork.querySelectorAll('.particle');
      particles.forEach((particle, index) => {
        if (index < particles.length - 1) {
          const nextParticle = particles[index + 1];
          
          const x1 = parseFloat(particle.style.left);
          const y1 = parseFloat(particle.style.top);
          const x2 = parseFloat(nextParticle.style.left);
          const y2 = parseFloat(nextParticle.style.top);
          
          // Only create connection if particles are close enough
          const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          if (distance < 20) {
            const connection = document.createElement('div');
            connection.className = 'connection';
            
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            const length = distance * 1.5; // Adjust for % units
            
            connection.style.width = `${length}%`;
            connection.style.left = `${x1}%`;
            connection.style.top = `${y1}%`;
            connection.style.transform = `rotate(${angle}deg)`;
            connection.style.animationDelay = `${Math.random() * 6}s`;
            
            particleNetwork.appendChild(connection);
          }
        }
      });
    }

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          setVisibleSections(prev => [...prev, id]);
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    // Observe all sections
    document.querySelectorAll('.about-section').forEach(section => {
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section className="about" id="about">
      {/* Background Animations */}
      <div className="particle-network"></div>
      <div className="energy-orb"></div>
      <div className="energy-orb"></div>
      <div className="energy-orb"></div>
      
      <div className="about-content-wrapper">
        {/* Hero Section */}
        <div className="about-hero">
          <h1>About Scanify</h1>
          <p>Transforming how businesses manage receipts and expenses with cutting-edge technology and intuitive design.</p>
        </div>

        {/* Mission Section */}
        <div id="mission" className="about-section animate-on-scroll">
          <h2>Our Mission</h2>
          <p>At Scanify, we believe that managing financial documents should be effortless, intuitive, and even enjoyable. Our mission is to empower businesses and individuals with tools that simplify expense tracking, reduce administrative overhead, and provide valuable insights into spending patterns.</p>
          <p>By leveraging advanced OCR technology and AI-powered categorization, we're transforming the way companies handle their financial workflows, saving time and reducing errors in the process.</p>
        </div>

        {/* Team Section */}
        <div id="team" className="about-section animate-on-scroll">
          <h2>Our Team</h2>
          <p>We're a diverse group of innovators, designers, and problem-solvers dedicated to creating the best expense management experience.</p>
          
          <div className="team-grid">
            <div className="team-member">
              <div className="member-image">
                <FaUsers />
              </div>
              <h3 className="member-name">Alex Johnson</h3>
              <p className="member-role">CEO & Founder</p>
              <p className="member-desc">Former financial analyst with a vision to simplify expense management for businesses of all sizes.</p>
            </div>
            
            <div className="team-member">
              <div className="member-image">
                <FaRocket />
              </div>
              <h3 className="member-name">Sarah Chen</h3>
              <p className="member-role">CTO</p>
              <p className="member-desc">AI and machine learning expert with a passion for building transformative technology.</p>
            </div>
            
            <div className="team-member">
              <div className="member-image">
                <FaChartLine />
              </div>
              <h3 className="member-name">Michael Torres</h3>
              <p className="member-role">Head of Design</p>
              <p className="member-desc">Creates intuitive user experiences that make complex financial tasks simple and enjoyable.</p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div id="stats" className="about-section animate-on-scroll">
          <h2>By The Numbers</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Active Users</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-number">2M+</div>
              <div className="stat-label">Receipts Processed</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-number">98%</div> 
              <div className="stat-label">Accuracy Rate</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-number">15+</div>
              <div className="stat-label">Countries Served</div>
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        <div id="timeline" className="about-section animate-on-scroll">
          <h2>Our Journey</h2>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-date">January 2022</div>
              <div className="timeline-content">
                <h3>Company Founded</h3>
                <p>Scanify was born out of a frustration with existing expense management solutions and a vision for something better.</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-date">June 2022</div>
              <div className="timeline-content">
                <h3>Beta Launch</h3>
                <p>Our first version was released to a select group of users who provided invaluable feedback for improvement.</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-date">December 2022</div>
              <div className="timeline-content">
                <h3>AI Integration</h3>
                <p>Implemented machine learning algorithms to automatically categorize expenses and extract data from receipts.</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-date">Present</div>
              <div className="timeline-content">
                <h3>Growing Rapidly</h3>
                <p>Now serving thousands of users across multiple countries with continuous improvements and new features.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {/* <div className="about-cta animate-on-scroll">
          <h2>Join Our Journey</h2>
          <p>Become part of our story and discover how Scanify can transform your expense management process.</p>
          <a href="#contact" className="cta-button">
            <span>Get Started</span> <FaArrowRight />
          </a>
        </div> */}
      </div>
    </section>
  );
};

export default About;