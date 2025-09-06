import React, { useState, useRef, useEffect } from "react";
import jsPDF from 'jspdf';
import "./UploadReceipt.css";

const UploadReceipt = () => {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploaded, setIsUploaded] = useState(false);
    const [processedData, setProcessedData] = useState(null);
    const [error, setError] = useState(null);
    const [recentReceipts, setRecentReceipts] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchRecentReceipts();
    }, []);

    const fetchRecentReceipts = async () => {
        try {
            const token = localStorage.getItem("token");
            const email = localStorage.getItem("email");

            if (!token || !email) {
                setError("User not logged in. Please log in to view recent receipts.");
                return;
            }

            const response = await fetch(`http://localhost:5000/api/receipt/recent?email=${email}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch recent receipts");
            }

            setRecentReceipts(data);
        } catch (err) {
            console.error("Error fetching recent receipts:", err);
            setError(err.message); // Display the error to the user
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.type === "image/jpeg" || droppedFile.type === "image/png" || droppedFile.type === "application/pdf")) {
            setFile(droppedFile);
            setFileName(droppedFile.name);
        } else {
            setError("Please upload a valid image (JPEG, PNG) or PDF file");
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.type === "image/jpeg" || selectedFile.type === "image/png" || selectedFile.type === "application/pdf")) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setError(null);
        } else {
            setError("Please upload a valid image (JPEG, PNG) or PDF file");
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file first");
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const token = localStorage.getItem("token");
            const email = localStorage.getItem("email");

            if (!token) {
                throw new Error("Please login to upload receipts");
            }
            if (!email) {
                throw new Error("User email not found in localStorage. Please login again.");
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("email", email);

            const response = await fetch("http://localhost:5000/api/receipt/upload", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Upload failed");
            }

            setProcessedData(data);
            setIsUploaded(true);
            fetchRecentReceipts();  // Refresh recent receipts after upload
        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };


    const generatePDF = (data) => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Receipt Report", 105, 20, { align: "center" });

        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25); // Separator line

        // Receipt Info
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Merchant: ${data.merchant || "N/A"}`, 20, 40);
        doc.text(`Date: ${data.date || "N/A"}`, 20, 48);
        doc.text(`Total: ${data.currency || "$"}${data.total || 0}`, 20, 56);

        if (data.subtotal) {
            doc.text(`Subtotal: ${data.currency || "$"}${data.subtotal.toFixed(2)}`, 20, 64);
        }

        // Tax
        if (data.tax || data.tax_percent) {
            let taxString = "";
            if (data.tax_percent) {
                taxString += `${data.tax_percent.toFixed(2)}%`;
            }
            if (data.tax) {
                if (data.tax_percent) taxString += " ";
                taxString += `(${data.currency || "$"}${data.tax.toFixed(2)})`;
            }
            doc.text(`Tax: ${taxString}`, 20, 72);
        }

        // Items Table Header
        doc.setFont("helvetica", "bold");
        doc.text("Items", 20, 90);
        doc.setFont("helvetica", "normal");

        // Draw table
        let y = 100;
        doc.setFontSize(11);
        doc.text("Description", 20, y);
        doc.text("Category", 110, y);
        doc.text("Amount", 170, y, { align: "right" });

        y += 6;
        doc.line(20, y, 190, y); // Table header underline
        y += 6;

        data.items.forEach((item) => {
            doc.text(item.description || "-", 20, y);
            doc.text(item.category || "-", 110, y);
            doc.text(
                `${item.currency || data.currency || "$"}${item.amount}`,
                170,
                y,
                { align: "right" }
            );
            y += 8;
            if (y > 270) {
                doc.addPage();
                y = 30;
            }
        });

        // Footer
        doc.setLineWidth(0.5);
        doc.line(20, 280, 190, 280);
        doc.setFontSize(10);
        doc.text("Generated by Scanify Receipt System", 105, 288, { align: "center" });

        doc.save(`receipt_${data._id || Date.now()}.pdf`);
    };

    const handleReset = () => {
        setFile(null);
        setFileName("");
        setIsUploaded(false);
        setProcessedData(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="upload-receipt-container">
            <div className="upload-receipt-card">
                <div className="card-header">
                    <h2>Upload Receipt</h2>
                    <p>Upload your receipt for automatic processing</p>
                </div>

                <div
                    className={`upload-area ${isDragging ? "dragging" : ""} ${isUploaded ? "uploaded" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="upload-icon">
                        <div className="file-icon">
                            <div className="file-corner"></div>
                            <div className="file-line file-line-1"></div>
                            <div className="file-line file-line-2"></div>
                            <div className="file-line file-line-3"></div>
                        </div>
                        <div className="upload-cloud">
                            <div className="cloud-body"></div>
                            <div className="cloud-arrow"></div>
                        </div>
                    </div>

                    <div className="upload-text">
                        {isUploaded ? (
                            <>
                                <h3>Upload Successful!</h3>
                                <p>Receipt processed successfully</p>
                            </>
                        ) : file ? (
                            <>
                                <h3>File Selected</h3>
                                <p>{fileName}</p>
                            </>
                        ) : (
                            <>
                                <h3>Drag & Drop</h3>
                                <p>your receipt file here or click to browse</p>
                                <span>Supports JPG, PNG, PDF - Max 10MB</span>
                            </>
                        )}
                    </div>

                    {isUploading && (
                        <div className="upload-progress">
                            <div className="progress-bar">
                                <div className="progress-fill"></div>
                            </div>
                            <span>Processing...</span>
                        </div>
                    )}

                    {isUploaded && (
                        <div className="success-checkmark">
                            <div className="check-icon">
                                <span className="icon-line line-tip"></span>
                                <span className="icon-line line-long"></span>
                                <div className="icon-circle"></div>
                                <div className="icon-fix"></div>
                            </div>
                        </div>
                    )}
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    style={{ display: "none" }}
                />

                <div className="upload-actions">
                    {!isUploaded ? (
                        <>
                            <button
                                className="browse-btn"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Browse Files
                            </button>
                            <button
                                className={`upload-btn ${file ? "active" : ""}`}
                                onClick={handleUpload}
                                disabled={!file || isUploading}
                            >
                                Process Receipt
                            </button>
                        </>
                    ) : (
                        <button
                            className="reset-btn"
                            onClick={handleReset}
                        >
                            Upload Another
                        </button>
                    )}
                </div>

                {error && <p className="error-text">{error}</p>}

                {processedData && (
                    <div className="report-section">
                        <h3>Processed Receipt Report</h3>
                        <p><strong>Merchant:</strong> {processedData.merchant || 'N/A'}</p>
                        <p><strong>Date:</strong> {processedData.date || 'N/A'}</p>
                        <p><strong>Total:</strong> {processedData.currency || "$"}{processedData.total || 0}</p>

                        {/* Display Tax Section */}
                        {(processedData.tax || processedData.tax_percent) && (
                            <p>
                                <strong>Tax:</strong>
                                {processedData.tax_percent > 0 && `${processedData.tax_percent}%`}
                                {processedData.tax > 0 && ` (${processedData.currency || "$"}${processedData.tax})`}
                            </p>
                        )}

                        <h4>Items:</h4>
                        <ul>
                            {processedData.items.map((item, index) => (
                                <li key={index}>
                                    {item.description} - {item.currency || processedData.currency || "$"}{item.amount} ({item.category})
                                </li>
                            ))}
                        </ul>

                        {processedData.subtotal > 0 && (
                            <p><strong>Subtotal:</strong> {processedData.currency || "$"}{processedData.subtotal}</p>
                        )}

                    </div>
                )}

                <div className="recent-receipts-section">
                    <h3>Recent Receipts</h3>
                    {recentReceipts.length > 0 ? (
                        <table className="recent-receipts-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Merchant</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentReceipts.map((receipt) => (
                                    <tr key={receipt._id}>
                                        <td>{receipt.date || 'N/A'}</td>
                                        <td>{receipt.merchant || 'N/A'}</td>
                                        <td>{receipt.currency || '$'}{receipt.total || 0}</td>
                                        <td>
                                            <button
                                                className="download-btn small"
                                                onClick={() => generatePDF(receipt)}
                                            >
                                                Download PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No recent receipts found.</p>
                    )}
                </div>

                <div className="upload-features">
                    <div className="feature">
                        <div className="feature-icon">🔍</div>
                        <div className="feature-text">OCR Technology</div>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">⚡</div>
                        <div className="feature-text">Fast Processing</div>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">🔒</div>
                        <div className="feature-text">Secure Upload</div>
                    </div>
                </div>
            </div>

            <div className="floating-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
                <div className="shape shape-4"></div>
            </div>
        </div>
    );
};

export default UploadReceipt;