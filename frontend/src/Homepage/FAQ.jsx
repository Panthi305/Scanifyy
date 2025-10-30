import React, { useState } from "react";
import "./FAQ.css";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      q: "What is Scanify?",
      a: "Scanify is an AI-powered tool that scans and digitizes receipts, categorizes expenses, and generates reports instantly.",
    },
    {
      q: "How does the receipt scanning work?",
      a: "Simply upload or snap a picture of your receipt. Our AI extracts text, identifies vendors, amounts, and categorizes expenses automatically.",
    },
    {
      q: "Can I export my reports?",
      a: "Yes, you can download your expense reports in PDF or CSV format, making it easy to share with accountants or for tax filing.",
    },
    {
      q: "Is my data secure?",
      a: "Absolutely. We use encryption and secure cloud storage to protect your receipts and financial data.",
    },
    {
      q: "Is Scanify free?",
      a: "You can start with our free plan. Premium features like advanced analytics and unlimited storage are available on paid plans.",
    },
  ];

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="faq" id="faq">
      <h2>Frequently Asked Questions</h2>
      <div className="faq-container">
        {faqs.map((item, index) => (
          <div
            key={index}
            className={`faq-item ${activeIndex === index ? "active" : ""}`}
            onClick={() => toggleFAQ(index)}
          >
            <div className="faq-grid"></div>
            <div className="faq-question">
              <h3>{item.q}</h3>
              {activeIndex === index ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            <div className="faq-answer">
              <p>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
