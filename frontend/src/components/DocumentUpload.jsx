import React, { useState } from 'react';
import { Upload, File, CheckCircle, XCircle, Loader, Cloud, FileText, Trash2, AlertCircle } from 'lucide-react';
import { uploadDocument, uploadMultipleDocuments, deleteDocument } from '../utils/api';

const DocumentUpload = ({ onDocumentUploaded, uploadedDocs = [], onDocumentDeleted }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [deleting, setDeleting] = useState(null);

  const maxDocuments = 5;
  const canUploadMore = uploadedDocs.length < maxDocuments;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!canUploadMore) {
      alert(`Maximum ${maxDocuments} documents allowed. Please delete a document first.`);
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    if (!canUploadMore) {
      alert(`Maximum ${maxDocuments} documents allowed. Please delete a document first.`);
      return;
    }
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = async (files) => {
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    const remainingSlots = maxDocuments - uploadedDocs.length;
    if (files.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more document(s). Maximum is ${maxDocuments}.`);
      files = files.slice(0, remainingSlots);
    }

    setUploading(true);
    setUploadResults([]);

    try {
      let results;
      if (files.length === 1) {
        results = await uploadDocument(files[0]);
        results = [results];
      } else {
        const response = await uploadMultipleDocuments(files);
        results = response.results;
      }

      setUploadResults(results);

      // Notify parent component of successful uploads
      results.forEach(result => {
        if (result.success) {
          onDocumentUploaded(result);
        }
      });
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadResults([{
        fileName: 'Upload failed',
        success: false,
        error: error.response?.data?.error || error.message
      }]);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!doc.documentId) return;

    setDeleting(doc.documentId);
    try {
      await deleteDocument(doc.documentId);
      if (onDocumentDeleted) {
        onDocumentDeleted(doc.documentId);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete document');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Document Limit Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">Documents</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[...Array(maxDocuments)].map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i < uploadedDocs.length
                    ? 'bg-indigo-500'
                    : 'bg-gray-200'
                  }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500">
            {uploadedDocs.length}/{maxDocuments}
          </span>
        </div>
      </div>

      {/* Uploaded Documents List */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          {uploadedDocs.map((doc, index) => (
            <div
              key={doc.documentId || index}
              className="flex items-center p-3 bg-white rounded-xl border border-gray-100 group hover:border-gray-200 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{doc.fileName}</p>
                <p className="text-xs text-gray-500">{doc.totalChunks} chunks</p>
              </div>
              <button
                onClick={() => handleDelete(doc)}
                disabled={deleting === doc.documentId}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                title="Delete document"
              >
                {deleting === doc.documentId ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      {canUploadMore ? (
        <div
          className={`upload-zone rounded-2xl p-10 text-center transition-all ${dragActive ? 'drag-active' : ''
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mb-6">
            <Cloud className="w-8 h-8 text-indigo-600" />
          </div>
          <p className="text-xl font-semibold text-gray-800 mb-2">
            Drop your documents here
          </p>
          <p className="text-gray-500 mb-6">
            or click to browse from your computer
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.doc"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold cursor-pointer"
          >
            <Upload className="w-5 h-5" />
            Select Files
          </label>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['PDF', 'DOCX', 'TXT'].map((type) => (
              <span key={type} className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                {type}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Maximum file size: 10MB
          </p>
        </div>
      ) : (
        <div className="rounded-2xl p-8 text-center border-2 border-dashed border-amber-200 bg-amber-50/50">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="font-medium text-gray-800 mb-1">
            Document limit reached
          </p>
          <p className="text-sm text-gray-500">
            Delete a document above to upload more
          </p>
        </div>
      )}

      {/* Uploading State */}
      {uploading && (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 font-semibold text-gray-700">Processing documents...</p>
          <p className="text-sm text-gray-500">Extracting text and creating chunks</p>
        </div>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && !uploading && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Upload Results
          </h3>
          <div className="space-y-2">
            {uploadResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-center p-4 rounded-xl border transition-all ${result.success
                    ? 'bg-green-50/50 border-green-200 hover:bg-green-50'
                    : 'bg-red-50/50 border-red-200 hover:bg-red-50'
                  }`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${result.success ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{result.fileName}</p>
                  {result.success ? (
                    <p className="text-sm text-green-600">
                      {result.totalChunks} chunks created successfully
                    </p>
                  ) : (
                    <p className="text-sm text-red-600">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;