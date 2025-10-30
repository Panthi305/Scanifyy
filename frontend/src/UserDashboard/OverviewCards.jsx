import React, { useState, useEffect } from "react";
import "./OverviewCards.css";

const OverviewCards = ({ email }) => {
  const [cardsData, setCardsData] = useState([
    { title: "Total Spend", value: "Loading...", id: "total-spend" },
    { title: "Monthly Expense", value: "Loading...", id: "this-month" },
    { title: "Receipts", value: "Loading...", id: "receipts" },
    { title: "Categories", value: "Loading...", id: "categories" },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ STEP 1: Define API base URL (auto-switch for local vs Render)
  const getApiBaseUrl = () => {
    if (window.location.hostname.includes("localhost")) {
      return "http://localhost:5000"; // local Flask server
    } else {
      return "https://scanify-backend.onrender.com"; // ⚡ Replace with your actual backend Render URL
    }
  };

  // ✅ STEP 2: Fetch all overview data from backend
  const fetchOverviewData = async () => {
    if (!email) return;

    try {
      setIsLoading(true);

      const overviewResponse = await fetch(
        `${getApiBaseUrl()}/api/receipt/overview-data?email=${encodeURIComponent(email)}`
      );

      if (!overviewResponse.ok) {
        throw new Error(`HTTP error! status: ${overviewResponse.status}`);
      }

      const overviewData = await overviewResponse.json();
      if (overviewData.error) {
        throw new Error(overviewData.error);
      }

      setCardsData([
        {
          title: "Total Spend",
          value: formatCurrency(overviewData.totalSpend, overviewData.currency),
          id: "total-spend",
        },
        {
          title: "This Month",
          value: formatCurrency(overviewData.thisMonthSpend, overviewData.currency),
          id: "this-month",
        },
        {
          title: "Receipts",
          value: overviewData.receiptsCount?.toString() || "0",
          id: "receipts",
        },
        {
          title: "Categories",
          value: overviewData.categoriesCount?.toString() || "0",
          id: "categories",
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch overview data:", error);
      setCardsData((prev) =>
        prev.map((card) => ({
          ...card,
          value: "Error",
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ STEP 3: Format currency
  const formatCurrency = (amount, currencySymbol = "₹") => {
    if (amount === undefined || amount === null) return `${currencySymbol}0`;
    return `${currencySymbol}${amount.toLocaleString("en-IN")}`;
  };

  // ✅ STEP 4: Auto-refresh every 30 seconds
  useEffect(() => {
    fetchOverviewData();
    const intervalId = setInterval(fetchOverviewData, 30000);
    return () => clearInterval(intervalId);
  }, [email]);

  return (
    <div className="overview-cards">
      {cardsData.map((card) => (
        <div key={card.id} className="overview-card">
          <h3 className="card-title">{card.title}</h3>
          <p className="card-value">{isLoading ? "Loading..." : card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default OverviewCards;
