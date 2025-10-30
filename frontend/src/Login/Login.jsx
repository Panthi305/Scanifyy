import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const cardRef = useRef(null);
  const sectionRef = useRef(null);
  const navigate = useNavigate();
  const API_URL = "https://scanify-backend.onrender.com";


  useEffect(() => {
    // No JS initialization needed for the background elements
    // All animations are handled by CSS
  }, []);

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setError(null);
    setSuccess(null);
  };

  const handleMouseMove = (e) => {
    if (cardRef.current && sectionRef.current) {
      const rect = sectionRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cardX = x - rect.width / 2;
      const cardY = y - rect.height / 2;

      const rotateY = cardX / rect.width * 5; // Reduced rotation for more subtle effect
      const rotateX = -cardY / rect.height * 5;

      cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // ✅ Store both token and email
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', email);

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const username = e.target.username.value;
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const response = await fetch(`${API_URL}/api/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // ✅ Save email for consistency
      localStorage.setItem('email', email);

      setSuccess('Signup successful! Please login.');
      setTimeout(toggleForm, 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section
      className="login-section"
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="background-effects">
        {/* Floating Elements */}
        <div className="floating-element"></div>
        <div className="floating-element"></div>
        <div className="floating-element"></div>

        {/* Grid and Pulse */}
        <div className="animated-grid"></div>
        <div className="pulse-effect"></div>

        {/* Connection Lines */}
        <div className="connection-lines">
          <div className="connection-line"></div>
          <div className="connection-line"></div>
          <div className="connection-line"></div>
          <div className="connection-line"></div>
        </div>
      </div>

      <div className="login-card" ref={cardRef}>
        <div className={`card-inner ${!isLogin ? 'flipped' : ''}`}>
          <div className="card-face card-front">
            <h2 className="form-title">Welcome Back</h2>
            <form className="login-form" onSubmit={handleLogin}>
              <div className="input-group">
                <input type="email" name="email" placeholder=" " required />
                <label>Email</label>
              </div>
              <div className="input-group">
                <input type="password" name="password" placeholder=" " required />
                <label>Password</label>
              </div>
              <button type="submit" className="cta-btn">
                <span>Login</span>
              </button>
            </form>
            {error && <p className="error-text">{error}</p>}
            {success && <p className="success-text">{success}</p>}
            <p className="toggle-text">
              Don't have an account? <span onClick={toggleForm}>Sign Up</span>
            </p>
          </div>

          <div className="card-face card-back">
            <h2 className="form-title">Create Account</h2>
            <form className="login-form" onSubmit={handleSignup}>
              <div className="input-group">
                <input type="text" name="username" placeholder=" " required />
                <label>Username</label>
              </div>
              <div className="input-group">
                <input type="email" name="email" placeholder=" " required />
                <label>Email</label>
              </div>
              <div className="input-group">
                <input type="password" name="password" placeholder=" " required />
                <label>Password</label>
              </div>
              <button type="submit" className="cta-btn">
                <span>Sign Up</span>
              </button>
            </form>
            {error && <p className="error-text">{error}</p>}
            {success && <p className="success-text">{success}</p>}
            <p className="toggle-text">
              Already have an account? <span onClick={toggleForm}>Login</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;