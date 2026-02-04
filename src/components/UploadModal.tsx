import React, { useState } from 'react';
import { bulkUploadCSVToServer } from '../utils/api';
import '../styles/UploadModal.css';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{
        [key: string]: 'pending' | 'uploading' | 'success' | 'error';
    }>({});

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        setFiles(prev => [...prev, ...selectedFiles]);

        // Reset input
        e.target.value = '';
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        const progressMap: typeof uploadProgress = {};
        files.forEach(f => {
            progressMap[f.name] = 'pending';
        });
        setUploadProgress(progressMap);

        try {
            const filesToUpload = await Promise.all(
                files.map(async (file) => {
                    setUploadProgress(prev => ({
                        ...prev,
                        [file.name]: 'uploading'
                    }));
                    const text = await file.text();
                    return { filename: file.name, text };
                })
            );

            const result = await bulkUploadCSVToServer(filesToUpload);

            // Mark successful uploads
            if (result.results) {
                result.results.forEach((r: any) => {
                    if (r.success) {
                        setUploadProgress(prev => ({
                            ...prev,
                            [r.filename]: 'success'
                        }));
                    }
                });
            }

            // Mark failed uploads
            if (result.errors) {
                result.errors.forEach((e: any) => {
                    setUploadProgress(prev => ({
                        ...prev,
                        [e.filename]: 'error'
                    }));
                });
            }

            // Wait a moment then close
            setTimeout(() => {
                setFiles([]);
                setUploadProgress({});
                onUploadComplete();
                onClose();
            }, 1500);
        } catch (err) {
            console.error('Upload failed', err);
            files.forEach(f => {
                setUploadProgress(prev => ({
                    ...prev,
                    [f.name]: 'error'
                }));
            });
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Bulk Upload CSV Files</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <div className="drop-zone">
                        <input
                            type="file"
                            multiple
                            accept=".csv"
                            onChange={handleFileSelect}
                            id="file-input"
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="file-input" className="drop-zone-label">
                            <div className="drop-zone-icon">📁</div>
                            <div className="drop-zone-text">
                                <strong>Click to select files or drag & drop</strong>
                                <p>CSV files will be parsed and uploaded</p>
                            </div>
                        </label>
                    </div>

                    {files.length > 0 && (
                        <div className="file-list">
                            <h3>Selected Files ({files.length})</h3>
                            {files.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="file-item">
                                    <div className="file-info">
                                        <span className="file-icon">📄</span>
                                        <div className="file-details">
                                            <span className="file-name">{file.name}</span>
                                            <span className="file-size">
                                                {(file.size / 1024).toFixed(2)} KB
                                            </span>
                                        </div>
                                    </div>
                                    <div className="file-status">
                                        {uploadProgress[file.name] === 'success' && (
                                            <span className="status-badge success">✓ Done</span>
                                        )}
                                        {uploadProgress[file.name] === 'error' && (
                                            <span className="status-badge error">✗ Failed</span>
                                        )}
                                        {uploadProgress[file.name] === 'uploading' && (
                                            <span className="status-badge uploading">⟳ Uploading...</span>
                                        )}
                                        {!uploadProgress[file.name] && (
                                            <button
                                                className="remove-btn"
                                                onClick={() => handleRemoveFile(index)}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="btn-cancel"
                        onClick={onClose}
                        disabled={uploading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-upload"
                        onClick={handleUpload}
                        disabled={files.length === 0 || uploading}
                    >
                        {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;
