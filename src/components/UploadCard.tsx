import React from 'react';
import '../styles/UploadCard.css';

interface UploadCardProps {
    filename: string;
    uploadedAt: string;
    dataDate?: string | null;
    formattedDataDate?: string | null;
    onLoad: () => void;
    isLoading?: boolean;
}

const UploadCard: React.FC<UploadCardProps> = ({
    filename,
    uploadedAt,
    formattedDataDate,
    onLoad,
    isLoading = false
}) => {
    const uploadDate = new Date(uploadedAt);
    const isToday = uploadDate.toDateString() === new Date().toDateString();

    return (
        <div className="upload-card">
            <div className="upload-card-content">
                <div className="upload-card-header">
                    <span className="upload-icon">📊</span>
                    <h4 className="upload-filename">{filename}</h4>
                </div>

                <div className="upload-card-dates">
                    {formattedDataDate && (
                        <div className="date-item">
                            <span className="date-label">Data Date:</span>
                            <span className="date-value">{formattedDataDate}</span>
                        </div>
                    )}
                    <div className="date-item">
                        <span className="date-label">Uploaded:</span>
                        <span className="date-value">
                            {isToday ? 'Today at ' : ''}
                            {uploadDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                </div>
            </div>

            <button
                className="upload-card-btn"
                onClick={onLoad}
                disabled={isLoading}
            >
                {isLoading ? '⟳ Loading...' : '→ Load'}
            </button>
        </div>
    );
};

export default UploadCard;
