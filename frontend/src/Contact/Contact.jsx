import React, { useState, useEffect } from "react";
import "./Contact.css";
import { FaPaperPlane, FaPhone, FaEnvelope } from "react-icons/fa";

const Contact = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const API_URL = "https://scanify-backend.onrender.com";


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

        // Create digital rain effect
        const digitalRain = document.querySelector('.digital-rain');
        if (digitalRain) {
            const characters = '01010101Scanify1010101';
            for (let i = 0; i < 40; i++) {
                const char = document.createElement('div');
                char.className = 'digital-char';
                char.textContent = characters.charAt(Math.floor(Math.random() * characters.length));
                char.style.left = `${Math.random() * 100}%`;
                char.style.animationDelay = `${Math.random() * 15}s`;
                char.style.animationDuration = `${10 + Math.random() * 10}s`;
                digitalRain.appendChild(char);
            }
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Clear any previous status when user starts typing
        if (submitStatus) setSubmitStatus(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            const response = await fetch(`${API_URL}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitStatus({ type: 'success', message: "Thank you for your message! We'll be in touch shortly." });
                setFormData({ name: "", email: "", message: "" });
            } else {
                setSubmitStatus({ type: 'error', message: data.message || 'Failed to send message. Please try again.' });
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setSubmitStatus({ type: 'error', message: 'Network error. Please check your connection and try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="contact" id="contact">
            {/* New Background Animations */}
            <div className="particle-network"></div>
            <div className="digital-rain"></div>
            <div className="energy-orb"></div>
            <div className="energy-orb"></div>
            <div className="energy-orb"></div>

            <div className="contact-content-wrapper">
                <div className="contact-info">
                    <h2>Get in Touch</h2>
                    <p>Have a question or need support? We're here to help you get the most out of our app.</p>

                    <div className="info-item">
                        <FaEnvelope className="info-icon" />
                        <span>support@Scanify.com</span>
                    </div>
                    <div className="info-item">
                        <FaPhone className="info-icon" />
                        <span>+1 (555) 123-4567</span>
                    </div>
                </div>

                <form className="contact-form" onSubmit={handleSubmit}>
                    <div className="form-group cyber-input">
                        <label htmlFor="name">Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-group cyber-input">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-group cyber-input">
                        <label htmlFor="message">Message</label>
                        <textarea
                            id="message"
                            name="message"
                            rows="6"
                            value={formData.message}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                        ></textarea>
                    </div>

                    {/* Status Message */}
                    {submitStatus && (
                        <div className={`status - message ${submitStatus.type} `}>
                            {submitStatus.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="submit-btn hologram-btn"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span>Sending...</span>
                        ) : (
                            <>
                                <span>Send Message</span> <FaPaperPlane className="btn-icon" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default Contact;