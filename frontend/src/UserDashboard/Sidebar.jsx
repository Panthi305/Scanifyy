import React from "react";
import {
  FaHome,
  FaTachometerAlt,
  FaUpload,
  FaChartPie,
  FaUser,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = ({ activeTab, setActiveTab, handleLogout }) => {
  const navigate = useNavigate();

  return (
    <nav className="sidebar" aria-label="Primary Navigation">
      <h2 className="logo">Scanify</h2>
      <ul>
        {[
          { key: "home", icon: <FaHome />, label: "Home", path: "/" },
          { key: "dashboard", icon: <FaTachometerAlt />, label: "Dashboard" },
          { key: "upload", icon: <FaUpload />, label: "Upload" },
          { key: "reports", icon: <FaChartPie />, label: "Reports" },
          { key: "profile", icon: <FaUser />, label: "Profile" },
         
        ].map(({ key, icon, label, path }) => (
          <li
            key={key}
            className={activeTab === key ? "active" : ""}
            onClick={() => {
              setActiveTab(key);
              if (path) navigate(path);
            }}
            tabIndex={0}
            role="button"
            aria-current={activeTab === key ? "page" : undefined}
          >
            {icon} <span>{label}</span>
          </li>
        ))}
        <li
          className="logout"
          onClick={handleLogout}
          tabIndex={0}
          role="button"
          aria-label="Logout"
        >
          <FaSignOutAlt /> <span>Logout</span>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
