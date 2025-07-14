import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, AlertCircle, Loader, FileText, Leaf, Download, Eye } from 'lucide-react';
import apiService from '../services/apiService';
import Card, { CardBody, CardFooter } from './common/Card';
import Button, { ButtonGroup } from './common/Button';

/**
 * Submissions Screen Component
 * Displays the list of rice monitoring submissions for the current user
 * 
 * @param {Object} props - Component properties
 * @param {function} props.setActiveTab - Function to change the active tab
 * @param {function} props.onLogout - Function to handle user logout
 * @param {Object} props.currentUser - Current logged-in user data
 * @param {function} props.showToast - Function to show toast notifications
 */
const SubmissionsScreen = ({ setActiveTab, onLogout, currentUser, showToast }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 20
  });

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiService.getSubmissions(filters);
      
      if (response.success) {
        setSubmissions(response.data.submissions || []);
      } else {
        setError(response.message || 'Failed to load submissions');
      }
    } catch (error) {
      // console.error('Error loading submissions:', error);
      setError('Failed to load submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load submissions on component mount and when filters change
  useEffect(() => {
    loadSubmissions();
  }, [filters, loadSubmissions]);

  /**
   * Get status color classes for badges
   * @param {string} status - Submission status
   * @returns {string} CSS classes for status badge
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Format date string for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  /**
   * Format status text for display
   * @param {string} status - Submission status
   * @returns {string} Formatted status text
   */
  const formatStatus = (status) => {
    return status.replace('_', ' ').toUpperCase();
  };

  /**
   * Handle status filter change
   * @param {string} status - New status filter value
   */
  const handleStatusFilter = (status) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  /**
   * Handle view submission details
   * @param {Object} submission - Submission to view
   */
  const handleViewSubmission = (submission) => {
    setSelectedSubmission(submission);
  };

  /**
   * Handle export submissions
   */
  const handleExport = async () => {
    try {
      const blob = await apiService.exportSubmissions();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'submissions.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      if (showToast) {
        showToast('Submissions exported successfully!', 'success');
      }
    } catch (error) {
      // console.error('Export error:', error);
      if (showToast) {
        showToast('Failed to export submissions', 'error');
      }
    }
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Submissions History</h1>
            <p className="text-green-100 text-sm">
              View all monitoring records • {submissions.length} submissions
            </p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-green-500 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-green-100" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-20">
        {/* Filters and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={filters.status === '' ? 'primary' : 'outline'}
              onClick={() => handleStatusFilter('')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filters.status === 'submitted' ? 'primary' : 'outline'}
              onClick={() => handleStatusFilter('submitted')}
            >
              Submitted
            </Button>
            <Button
              size="sm"
              variant={filters.status === 'under_review' ? 'primary' : 'outline'}
              onClick={() => handleStatusFilter('under_review')}
            >
              Under Review
            </Button>
            <Button
              size="sm"
              variant={filters.status === 'approved' ? 'primary' : 'outline'}
              onClick={() => handleStatusFilter('approved')}
            >
              Approved
            </Button>
          </div>

          {/* Actions */}
          <ButtonGroup>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              leftIcon={<Download />}
            >
              Export
            </Button>
          </ButtonGroup>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
              <button
                onClick={loadSubmissions}
                className="text-red-600 hover:text-red-800 text-sm font-medium mt-1 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Submissions List */}
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">
                      {submission.location}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(submission.date)}
                    </p>
                  </div>
                  <span 
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(submission.status)}`}
                  >
                    {formatStatus(submission.status)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-500">Growth Stage:</span>
                    <p className="font-medium text-gray-800">{submission.growth_stage}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Observer:</span>
                    <p className="font-medium text-gray-800">{submission.observer_name}</p>
                  </div>
                </div>

                {/* Plant Conditions */}
                {submission.plant_conditions && submission.plant_conditions.length > 0 && (
                  <div className="mb-4">
                    <span className="text-gray-500 text-sm">Conditions:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {submission.plant_conditions.slice(0, 3).map((condition, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {condition}
                        </span>
                      ))}
                      {submission.plant_conditions.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                          +{submission.plant_conditions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {submission.notes && (
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-gray-500 text-sm">Notes:</span>
                    <p className="text-gray-700 text-sm mt-1 line-clamp-2">
                      {submission.notes}
                    </p>
                  </div>
                )}
              </CardBody>

              <CardFooter className="bg-gray-50">
                <ButtonGroup>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewSubmission(submission)}
                    leftIcon={<Eye />}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Download />}
                  >
                    Download
                  </Button>
                </ButtonGroup>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* Empty State */}
        {!loading && submissions.length === 0 && (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {filters.status ? 'No submissions found' : 'No Submissions Yet'}
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {filters.status 
                ? `No submissions found with status "${formatStatus(filters.status)}".`
                : 'Start monitoring your fields to see submissions here.'
              }
            </p>
            {!filters.status && (
              <Button onClick={() => setActiveTab('form')} leftIcon={<Leaf />}>
                Start Monitoring
              </Button>
            )}
            {filters.status && (
              <Button variant="outline" onClick={() => handleStatusFilter('')}>
                Clear Filter
              </Button>
            )}
          </div>
        )}

        {/* Load More Button (if pagination is needed) */}
        {submissions.length >= filters.limit && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => setFilters(prev => ({ ...prev, limit: prev.limit + 20 }))}
            >
              Load More
            </Button>
          </div>
        )}
      </div>

      {/* Submission Detail Modal (simplified for now) */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Submission Details
                </h2>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {/* Add detailed submission view here */}
              <div className="space-y-4">
                <div>
                  <strong>Location:</strong> {selectedSubmission.location}
                </div>
                <div>
                  <strong>Date:</strong> {formatDate(selectedSubmission.date)}
                </div>
                <div>
                  <strong>Growth Stage:</strong> {selectedSubmission.growth_stage}
                </div>
                {selectedSubmission.notes && (
                  <div>
                    <strong>Notes:</strong>
                    <p className="mt-1 text-gray-700">{selectedSubmission.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSubmission(null)}
                  fullWidth
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionsScreen;