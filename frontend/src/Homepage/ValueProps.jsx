import React from "react";

import "./ValueProps.css";

import { FaCheckCircle } from "react-icons/fa";



const ValueProps = () => {

    const values = [

        "AI-powered categorization, not just OCR",

        "Saves hours of manual bookkeeping",

        "Perfect for individuals & small businesses",

        "Audit-ready and secure storage",

    ];



    return (

        <section className="valueprops">

            <div className="bg-element bg-element-1"></div>

            <div className="bg-element bg-element-2"></div>



            <h2>Why Choose Us?</h2>

            <ul>

                {values.map((v, i) => (

                    <li key={i}>

                        <div className="icon-container">

                            <FaCheckCircle className="icon" />

                        </div>

                        <span className="value-text">{v}</span>

                    </li>

                ))}

            </ul>

        </section>

    );

};



export default ValueProps;

