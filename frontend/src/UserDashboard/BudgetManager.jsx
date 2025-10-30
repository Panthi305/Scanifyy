import React, { useState, useEffect, useCallback } from "react";
import "./BudgetManager.css";

const BudgetManager = ({ email }) => {
  const [categories, setCategories] = useState({
    "food & drinks": 0,
    "travel & transport": 0,
    "office & supplies": 0,
    "utilities & bills": 0,
    "electronics & gadgets": 0,
    "healthcare & pharmacy": 0,
    "entertainment & media": 0,
    "shopping & fashion": 0,
    "home & groceries": 0,
    "education & learning": 0,
    "personal care": 0,
    "sports & fitness": 0,
    "financial services": 0,
    "housing & rent": 0,
    "others": 0,
  });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const API_URL = "https://scanify-backend.onrender.com";

  // Fetch budget preferences when component mounts or email changes
  useEffect(() => {
    const fetchBudgetPreferences = async () => {
      setLoading(true);
      try {
        const userResponse = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!userResponse.ok) {
          throw new Error(`HTTP error! Status: ${userResponse.status}`);
        }
        const userData = await userResponse.json();
        if (userData.error) throw new Error(userData.error);

        console.log("Fetched user data:", userData);
        if (userData.budget_preferences) {
          const updatedCategories = { ...categories };
          Object.keys(categories).forEach((category) => {
            updatedCategories[category] = parseFloat(userData.budget_preferences[category]) || 0;
          });
          setCategories(updatedCategories);
          console.log("Updated categories:", updatedCategories);
        }
      } catch (err) {
        setError(err.message);
        console.error("Error fetching budget preferences:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetPreferences();
  }, [email]); // Only depend on email

  // Fetch budget alerts when component mounts or email changes
  useEffect(() => {
    const checkBudgetAlerts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/receipt/check-budget-alerts?email=${email}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setAlerts(data.alerts || []);
      } catch (err) {
        setError(err.message);
        console.error("Error checking budget alerts:", err);
      }
    };

    checkBudgetAlerts();
  }, [email]); // Only depend on email

  // Debounce input changes to prevent rapid state updates
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const handleInputChange = useCallback(
    debounce((category, value) => {
      setCategories((prev) => ({
        ...prev,
        [category]: parseFloat(value) || 0,
      }));
    }, 300),
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const totalPercentage = Object.values(categories).reduce((sum, val) => sum + val, 0);
    if (totalPercentage > 100) {
      setError("Total percentage cannot exceed 100%");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/receipt/set-budget-preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          email,
          preferences: categories,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setSuccess("Budget preferences saved successfully!");

      // Refresh alerts after saving preferences
      const alertResponse = await fetch(`${API_URL}/api/receipt/check-budget-alerts?email=${email}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!alertResponse.ok) {
        throw new Error(`HTTP error! Status: ${alertResponse.status}`);
      }
      const alertData = await alertResponse.json();
      if (alertData.error) throw new Error(alertData.error);
      setAlerts(alertData.alerts || []);
    } catch (err) {
      setError(err.message);
      console.error("Error saving budget preferences:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="budget-manager">
      <h3>Manage Your Budget</h3>
      <p>Allocate percentages to different spending categories (Total should not exceed 100%).</p>
      {loading && <div className="loading-text">Loading budget preferences...</div>}
      {error && <div className="error-text">{error}</div>}
      {success && <div className="success-text">{success}</div>}

      <form onSubmit={handleSubmit}>
        {Object.keys(categories).map((category) => (
          <div key={category} className="category-input">
            <label>{category.charAt(0).toUpperCase() + category.slice(1)}</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={categories[category] || 0}
              onChange={(e) => handleInputChange(category, e.target.value)}
              placeholder="Percentage"
            />
            <span>%</span>
          </div>
        ))}
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Budget Preferences"}
        </button>
      </form>

      {alerts.length > 0 && (
        <div className="budget-alerts">
          <h4>Budget Alerts</h4>
          {alerts.map((alert, index) => (
            <div key={index} className="alert">
              <p>
                <strong>{alert.category}</strong> is over budget! Current: {alert.current_percentage}%,
                Budget: {alert.budget_percentage}% (Overspend: {alert.overspend_amount.toFixed(2)}%)
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BudgetManager;