import React from "react";
import "./Homepage.css";
import Hero from "./Hero";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import DashboardPreview from "./DashboardPreview";
import ValueProps from "./ValueProps";
import FAQ from "./FAQ"

const Homepage = () => {
    return (
        <div className="homepage">
            <Hero />
            <Features />
            <HowItWorks />
            <DashboardPreview />
            <ValueProps />
            <FAQ />
        </div>
    );
};

export default Homepage;
