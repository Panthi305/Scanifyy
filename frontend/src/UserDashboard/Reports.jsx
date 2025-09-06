import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend
} from "recharts";
import "./Reports.css";

const Reports = () => {
  const [summary, setSummary] = useState({
    by_category: [],
    by_merchant: [],
    monthly_trend: [],
    currency: ""
  });
  const [budget, setBudget] = useState({
    actual: 0,
    monthly_budget: 0,
    yearly_budget: 0,
    status: "within",
    currency: ""
  });
  const [tax, setTax] = useState({
    total_tax: 0,
    avg_tax_rate: 0,
    receipts_with_tax: 0,
    currency: ""
  });
  const [forecast, setForecast] = useState({
    months: [],
    totals: [],
    forecast_next_month: 0,
    category_forecasts: [],
    currency: ""
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userEmail");

    if (!email || !token) {
      setErrors(prev => ({ ...prev, general: "User not authenticated. Please log in." }));
      setLoading(false);
      return;
    }

    const fetchData = async (url, setData, defaultData, endpoint) => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setErrors(prev => ({ ...prev, [endpoint]: null }));
        setData(data);
      } catch (err) {
        console.error(`Error fetching ${url}: ${err.message}`);
        setErrors(prev => ({ ...prev, [endpoint]: `Failed to fetch ${endpoint}: ${err.message}` }));
        setData(defaultData);
      }
    };

    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchData(
          `http://localhost:5000/api/receipt/report/summary?email=${email}`,
          setSummary,
          { by_category: [], by_merchant: [], monthly_trend: [], currency: "" },
          "summary"
        ),
        fetchData(
          `http://localhost:5000/api/receipt/report/budget?email=${email}`,
          setBudget,
          { actual: 0, monthly_budget: 0, yearly_budget: 0, status: "within", currency: "" },
          "budget"
        ),
        fetchData(
          `http://localhost:5000/api/receipt/report/tax?email=${email}`,
          setTax,
          { total_tax: 0, avg_tax_rate: 0, receipts_with_tax: 0, currency: "" },
          "tax"
        ),
        fetchData(
          `http://localhost:5000/api/receipt/report/forecast?email=${email}`,
          setForecast,
          { months: [], totals: [], forecast_next_month: 0, category_forecasts: [], currency: "" },
          "forecast"
        )
      ]);
      setLoading(false);
    };

    fetchAllData();
  }, []);

  const COLORS = ["#00C49F", "#FF6B6B", "#FFBB28", "#0088FE", "#9933FF"];

  return (
    <div className="reports-container mx-auto max-w-7xl p-6 bg-gray-900 text-gray-100 min-h-screen">
      <h2 className="reports-title text-3xl font-bold mb-6 text-center">
        📊 Expense Reports Dashboard ({summary.currency || "Unknown"})
      </h2>

      {loading && (
        <div className="flex justify-center items-center mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
        </div>
      )}

      {errors.general && (
        <p className="error bg-red-600 text-white p-4 rounded mb-6 text-center">
          {errors.general}
        </p>
      )}

      {!loading && (
        <div className="reports-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="report-card bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Category-Wise Spending</h3>
            {errors.summary && <p className="error text-red-400 mb-4">{errors.summary}</p>}
            {summary.by_category.length > 0 ? (
              <PieChart width={400} height={300}>
                <Pie
                  data={summary.by_category}
                  dataKey="total"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label
                >
                  {summary.by_category.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${summary.currency}${value.toFixed(2)}`} />
              </PieChart>
            ) : (
              <p className="text-gray-400">No category data available</p>
            )}
          </div>

          <div className="report-card bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Top Merchants</h3>
            {errors.summary && <p className="error text-red-400 mb-4">{errors.summary}</p>}
            {summary.by_merchant.length > 0 ? (
              <BarChart width={400} height={300} data={summary.by_merchant}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="_id" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip formatter={(value) => `${summary.currency}${value.toFixed(2)}`} />
                <Bar dataKey="total" fill="#00C49F" />
              </BarChart>
            ) : (
              <p className="text-gray-400">No merchant data available</p>
            )}
          </div>

          <div className="report-card lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Monthly Expense Trend</h3>
            {errors.summary && <p className="error text-red-400 mb-4">{errors.summary}</p>}
            {summary.monthly_trend.length > 0 ? (
              <LineChart width={600} height={300} data={summary.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="_id" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip formatter={(value) => `${summary.currency}${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#FF8042" />
              </LineChart>
            ) : (
              <p className="text-gray-400">No monthly trend data available</p>
            )}
          </div>

          <div className="report-card lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Expense Forecast</h3>
            {errors.forecast && <p className="error text-red-400 mb-4">{errors.forecast}</p>}
            {forecast.months.length > 0 && forecast.totals.length > 0 ? (
              <LineChart
                width={600}
                height={300}
                data={forecast.months.map((m, i) => ({
                  month: m,
                  total: forecast.totals[i] || 0
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="month" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip formatter={(value) => `${forecast.currency}${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#00C49F" />
              </LineChart>
            ) : (
              <p className="text-gray-400">No forecast trend data available</p>
            )}
            <p className="forecast-text text-lg mt-4">
              🔮 Next Month Forecast: <strong>{forecast.currency}{forecast.forecast_next_month.toFixed(2)}</strong>
            </p>
            <h4 className="text-lg font-semibold mt-4">Category-wise Forecasts & Overspend Risks</h4>
            {forecast.category_forecasts.length > 0 ? (
              <table className="category-forecast-table w-full mt-4 text-left">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="p-2">Category</th>
                    <th className="p-2">Forecast</th>
                    <th className="p-2">Likely Overspend?</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.category_forecasts.map((cf, index) => (
                    <tr key={index} className="border-b border-gray-600">
                      <td className="p-2">{cf.category || "Unknown"}</td>
                      <td className="p-2">{forecast.currency}{cf.forecast.toFixed(2)}</td>
                      <td className={cf.likely_overspend ? "text-red-400 p-2" : "text-green-400 p-2"}>
                        {cf.likely_overspend ? "🚨 Yes" : "✅ No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 mt-4">No category forecast data available</p>
            )}
          </div>

          <div className="report-card bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Budget vs Actual</h3>
            {errors.budget && <p className="e rror text-red-400 mb-4">{errors.budget}</p>}
            <p><strong>Actual Spending:</strong> {budget.currency}{budget.actual.toFixed(2)}</p>
            <p><strong>Monthly Budget:</strong> {budget.currency}{budget.monthly_budget.toFixed(2)}</p>
            <p><strong>Yearly Budget:</strong> {budget.currency}{budget.yearly_budget.toFixed(2)}</p>
            <p className={budget.status === "over" ? "text-red-400" : "text-green-400"}>
              Status: {budget.status === "over" ? "🚨 Over Budget" : "✅ Within Budget"}
            </p>
          </div>

          <div className="report-card bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Tax & Compliance</h3>
            {errors.tax && <p className="error text-red-400 mb-4">{errors.tax}</p>}
            <p><strong>Total Tax Paid:</strong> {tax.currency}{tax.total_tax.toFixed(2)}</p>
            <p><strong>Average Tax Rate:</strong> {tax.avg_tax_rate.toFixed(2)}%</p>
            <p><strong>Receipts with Tax:</strong> {tax.receipts_with_tax}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;