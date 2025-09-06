import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./UserDashboard.css";
import Sidebar from "./Sidebar";
import OverviewCards from "./OverviewCards";

import UploadReceipt from "./UploadReceipt";
import Reports from "./Reports";
import Profile from "./Profile";
import BudgetManager from "./BudgetManager";

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch user data");
        }

        setUser(data);
      } catch (err) {
        setError(err.message);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/home");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            {/* Pass the user's email to OverviewCards */}
            <OverviewCards email={user?.email} />
            <BudgetManager email={user?.email} />
          </>
        );
      case "upload":
        return <UploadReceipt />;
      case "reports":
        return <Reports />;
      case "profile":
        return <Profile />;
      default:
        return null;
    }
  };

  if (error) {
    return <div className="error-text">{error}</div>;
  }

  if (!user) {
    return <div className="content-box">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
      />
      <div className="main-content">
        {/* Greeting Header */}
        <div className="header">
          <h2 className="greeting">👋 Hello, {user.username}!</h2>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <div className="content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default UserDashboard;