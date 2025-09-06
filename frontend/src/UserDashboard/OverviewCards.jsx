import React, { useState, useEffect } from "react";
import "./OverviewCards.css"

const OverviewCards = ({ email }) => {
  const [cardsData, setCardsData] = useState([
    { title: "Total Spend", value: "Loading...", id: "total-spend" },
    { title: "Monthly Expense", value: "Loading...", id: "this-month" },
    { title: "Receipts", value: "Loading...", id: "receipts" },
    { title: "Categories", value: "Loading...", id: "categories" },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  // Get API base URL based on environment
  const getApiBaseUrl = () => {
    return window.location.hostname.includes('localhost') 
      ? 'http://localhost:5000' 
      : 'https://1z04b690-5000.inc1.devtunnels.ms';
  };

  // Fetch overview data from all endpoints
  const fetchOverviewData = async () => {
    if (!email) return;

    try {
      setIsLoading(true);
      
      // Create a single API call to get all required data
      const overviewResponse = await fetch(`${getApiBaseUrl()}/api/receipt/overview-data?email=${email}`);
      
      if (!overviewResponse.ok) {
        throw new Error(`HTTP error! status: ${overviewResponse.status}`);
      }

      const overviewData = await overviewResponse.json();
      
      if (overviewData.error) {
        throw new Error(overviewData.error);
      }

      // Update cards with the fetched data
      setCardsData([
        { 
          title: "Total Spend", 
          value: formatCurrency(overviewData.totalSpend, overviewData.currency),
          id: "total-spend" 
        },
        { 
          title: "This Month", 
          value: formatCurrency(overviewData.thisMonthSpend, overviewData.currency),
          id: "this-month" 
        },
        { 
          title: "Receipts", 
          value: overviewData.receiptsCount.toString(),
          id: "receipts" 
        },
        { 
          title: "Categories", 
          value: overviewData.categoriesCount.toString(),
          id: "categories" 
        },
      ]);

    } catch (error) {
      console.error("Failed to fetch overview data:", error);
      // Set error state but keep trying in the background
      setCardsData(prev => prev.map(card => ({
        ...card,
        value: "Error"
      })));
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency with symbol and proper formatting
  const formatCurrency = (amount, currencySymbol = '₹') => {
    if (amount === undefined || amount === null) return `${currencySymbol}0`;
    return `${currencySymbol}${amount.toLocaleString('en-IN')}`;
  };

  useEffect(() => {
    fetchOverviewData();

    // Optional: Set up polling to refresh data periodically
    const intervalId = setInterval(fetchOverviewData, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [email]);

  return (
    <div className="overview-cards">
      {cardsData.map((card) => (
        <div key={card.id} className="overview-card">
          <h3 className="card-title">{card.title}</h3>
          <p className="card-value">
            {isLoading ? "Loading..." : card.value}
          </p>
        </div>
      ))}
    </div>
  );
};

export default OverviewCards;