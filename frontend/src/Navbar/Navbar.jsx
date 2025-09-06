import React, { useState, useEffect } from "react";
import "./Navbar.css";
import { FaBars, FaTimes, FaUser } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in by checking for token
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLinkClick = () => setIsOpen(false);

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      {/* Logo */}
      <div className="nav-logo">
        <span className="logo-glow">Scanify</span>
        <div className="logo-underline"></div>
      </div>

      {/* Desktop / Mobile Menu */}
      <div className={`nav-main ${isOpen ? "open" : ""}`}>
        <ul className="nav-links">
          {["Home",  "About", "Contact"].map((link) => (
            <li key={link}>
              <Link
                to={`/${link.toLowerCase()}`}
                className="nav-link-item"
                onClick={handleLinkClick}
              >
                <span className="link-text">{link}</span>
                <div className="link-hover"></div>
              </Link>
            </li>
          ))}
        </ul>
        {/* Mobile login/profile button */}
        <div className="nav-actions mobile-login">
          <Link
            to={isLoggedIn ? "/dashboard" : "/login"}
            className="login-btn"
            onClick={handleLinkClick}
          >
            <FaUser className="btn-icon" />
            {!isLoggedIn && <span>Login</span>}
          </Link>
        </div>
      </div>

      {/* Desktop login/profile */}
      <div className="nav-actions desktop-login">
        <Link
          to={isLoggedIn ? "/dashboard" : "/login"}
          className="login-btn"
          onClick={handleLinkClick}
        >
          <FaUser className="btn-icon" />
          {!isLoggedIn && <span>Login</span>}
        </Link>
      </div>

      {/* Mobile toggle */}
      <div className="nav-toggle" onClick={toggleMenu}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </div>
    </nav>
  );
};

export default Navbar;