import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./Homepage/Homepage";
import Navbar from "./Navbar/Navbar";
import Footer from "./Footer/Footer";
import BackToTop from "./BackToTop";
import Login from "./Login/Login";
import Contact from "./Contact/Contact";
import About from "./About/About";
import UserDashboard from "./UserDashboard/UserDashboard";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route
          path="/dashboard"
          element={<UserDashboard />}
        />
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/home" element={<Homepage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<About />} />
                <Route path="/dashboard" element={<UserDashboard />} />
              </Routes>
              <BackToTop />
              <Footer />
            </>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;