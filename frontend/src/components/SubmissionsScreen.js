import React, { useState, useEffect, useCallback } from "react";
import {
  LogOut,
  AlertCircle,
  Loader,
  FileText,
  Leaf,
  Download,
  Eye,
  PlayCircle, // Added for video icon
  Music,      // Added for audio icon
  Edit,
} from "lucide-react";
import apiService from "../services/apiService";
import Card, { CardBody, CardFooter } from "./common/Card";
import Button, { ButtonGroup } from "./common/Button";

/**
 * Submissions Screen Component
 * Displays the list of rice monitoring submissions for the current user
 *
 * @param {Object} props - Component properties
 * @param {function} props.setActiveTab - Function to change the active tab
 * @param {function} props.onLogout - Function to handle user logout
 * @param {Object} props.currentUser - Current logged-in user data
 * @param {function} props.showToast - Function to show toast notifications
 * @param {function} props.onEditSubmission - Function to handle editing a submission
 */
const SubmissionsScreen = ({
  setActiveTab,
  onLogout,
  currentUser,
  showToast,
  onEditSubmission,
}) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    page: 1,
    limit: 20,
  });

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiService.getSubmissions(filters);

      if (response.success) {
        setSubmissions(response.data.submissions || []);
      } else {
        setError(response.message || "Failed to load submissions");
      }
    } catch (error) {
      // console.error('Error loading submissions:', error);
      setError("Failed to load submissions. Please try again.");
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
      case "submitted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "under_review":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  /**
   * Format date string for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
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
    return status.replace("_", " ").toUpperCase();
  };

  /**
   * Handle status filter change
   * @param {string} status - New status filter value
   */
  const handleStatusFilter = (status) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  /**
   * Handle view submission details
   * @param {Object} submission - Submission to view
   */
  const handleViewSubmission = async (submissionId) => {
    setSelectedSubmission(null); // Clear previous selection
    setDetailLoading(true);
    setDetailError("");
    try {
      const response = await apiService.getSubmission(submissionId);
      if (response.success) {
        setSelectedSubmission(response.data);
      } else {
        setDetailError(response.message || "Failed to load submission details.");
      }
    } catch (error) {
      setDetailError("Failed to load submission details. Please try again.");
    } finally {
      setDetailLoading(false);
    }
  };

  /**
   * Handle export submissions
   */
  const handleExport = async () => {
    try {
      const blob = await apiService.exportSubmissions();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "submissions.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      if (showToast) {
        showToast("Submissions exported successfully!", "success");
      }
    } catch (error) {
      // console.error('Export error:', error);
      if (showToast) {
        showToast("Failed to export submissions", "error");
      }
    }
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-8 h-8 mx-auto mb-4 text-green-600 animate-spin" />
          <p className="text-gray-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-4 py-6 text-white bg-gradient-to-r from-green-600 to-green-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Submissions History</h1>
            <p className="text-sm text-green-100">
              View all monitoring records • {submissions.length} submissions
            </p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 transition-colors rounded-lg hover:bg-green-500"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-green-100" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-20">
        {/* Filters and Actions */}
        <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={filters.status === "" ? "primary" : "outline"}
              onClick={() => handleStatusFilter("")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filters.status === "submitted" ? "primary" : "outline"}
              onClick={() => handleStatusFilter("submitted")}
            >
              Submitted
            </Button>
            <Button
              size="sm"
              variant={
                filters.status === "under_review" ? "primary" : "outline"
              }
              onClick={() => handleStatusFilter("under_review")}
            >
              Under Review
            </Button>
            <Button
              size="sm"
              variant={filters.status === "approved" ? "primary" : "outline"}
              onClick={() => handleStatusFilter("approved")}
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
          <div className="flex items-center p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
            <AlertCircle className="flex-shrink-0 w-5 h-5 mr-3 text-red-500" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
              <button
                onClick={loadSubmissions}
                className="mt-1 text-sm font-medium text-red-600 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Submissions List */}
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card
              key={submission.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="mb-1 font-semibold text-gray-800">
                      {submission.location}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(submission.date)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      submission.status
                    )}`}
                  >
                    {formatStatus(submission.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Growth Stage:</span>
                    <p className="font-medium text-gray-800">
                      {submission.growth_stage}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Observer:</span>
                    <p className="font-medium text-gray-800">
                      {submission.observer_name}
                    </p>
                  </div>
                </div>

                {/* Plant Conditions */}
                {submission.plant_conditions &&
                  submission.plant_conditions.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm text-gray-500">Conditions:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {submission.plant_conditions
                          .slice(0, 3)
                          .map((condition, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded-full"
                            >
                              {condition}
                            </span>
                          ))}
                        {submission.plant_conditions.length > 3 && (
                          <span className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                            +{submission.plant_conditions.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                {/* Notes */}
                {submission.notes && (
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Notes:</span>
                    <p className="mt-1 text-sm text-gray-700 line-clamp-2">
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
                    onClick={() => handleViewSubmission(submission.id)}
                    leftIcon={<Eye />}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditSubmission(submission.id)}
                    leftIcon={<Edit />}
                  >
                    Edit
                  </Button>
                </ButtonGroup>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {!loading && submissions.length === 0 && (
          <div className="py-20 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="mb-2 text-xl font-semibold text-gray-800">
              {filters.status ? "No submissions found" : "No Submissions Yet"}
            </h2>
            <p className="max-w-md mx-auto mb-6 text-gray-600">
              {filters.status
                ? `No submissions found with status "${formatStatus(
                    filters.status
                  )}".`
                : "Start monitoring your fields to see submissions here."}
            </p>
            {!filters.status && (
              <Button onClick={() => setActiveTab("form")} leftIcon={<Leaf />}>
                Start Monitoring
              </Button>
            )}
            {filters.status && (
              <Button variant="outline" onClick={() => handleStatusFilter("")}>
                Clear Filter
              </Button>
            )}
          </div>
        )}

        {/* Load More Button (if pagination is needed) */}
        {submissions.length >= filters.limit && (
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() =>
                setFilters((prev) => ({ ...prev, limit: prev.limit + 20 }))
              }
            >
              Load More
            </Button>
          </div>
        )}
      </div>

      {/* Submission Detail Modal (simplified for now) */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
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
              {detailLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader className="w-8 h-8 animate-spin text-green-600" />
                  <p className="ml-2 text-gray-600">Loading details...</p>
                </div>
              ) : detailError ? (
                <div className="text-red-500 text-center py-4">{detailError}</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <strong>Location:</strong> {selectedSubmission.field.name} ,{" "}
                    {selectedSubmission.field.location}
                  </div>
                  <div>
                    <strong>Date:</strong> {formatDate(selectedSubmission.date)}
                  </div>
                  <div>
                    <strong>Growth Stage:</strong>{" "}
                    {selectedSubmission.growth_stage}
                  </div>

                  {/* Plant Conditions Details */}
                  {selectedSubmission.plant_conditions && (
                    <div>
                      <strong>Plant Conditions:</strong>
                      <ul className="list-disc list-inside ml-4">
                        {selectedSubmission.plant_conditions.Healthy && <li>Healthy</li>}
                        {selectedSubmission.plant_conditions.Unhealthy && <li>Unhealthy</li>}

                        {selectedSubmission.plant_conditions["Signs of pest infestation"] && (
                          <li>
                            Signs of pest infestation:
                            <ul className="list-circle list-inside ml-4">
                              {Object.entries(selectedSubmission.plant_conditions.pestDetails || {}).map(([pest, selected]) => (
                                selected && <li key={pest}>{pest}</li>
                              ))}
                              {selectedSubmission.plant_conditions.otherPest && (
                                <li>Other: {selectedSubmission.plant_conditions.otherPest}</li>
                              )}
                            </ul>
                          </li>
                        )}

                        {selectedSubmission.plant_conditions["Signs of nutrient deficiency"] && (
                          <li>
                            Signs of nutrient deficiency:
                            <ul className="list-circle list-inside ml-4">
                              {Object.entries(selectedSubmission.plant_conditions.nutrientDeficiencyDetails || {}).map(([nutrient, selected]) => (
                                selected && <li key={nutrient}>{nutrient}</li>
                              ))}
                              {selectedSubmission.plant_conditions.otherNutrient && (
                                <li>Other: {selectedSubmission.plant_conditions.otherNutrient}</li>
                              )}
                            </ul>
                          </li>
                        )}

                        {selectedSubmission.plant_conditions["Water stress (drought or flood)"] && (
                          <li>
                            Water stress (drought or flood):
                            {selectedSubmission.plant_conditions.waterStressLevel && (
                              <span className="ml-2 font-medium">{selectedSubmission.plant_conditions.waterStressLevel}</span>
                            )}
                          </li>
                        )}

                        {selectedSubmission.plant_conditions["Lodging (bent/broken stems)"] && (
                          <li>
                            Lodging (bent/broken stems):
                            {selectedSubmission.plant_conditions.lodgingLevel && (
                              <span className="ml-2 font-medium">{selectedSubmission.plant_conditions.lodgingLevel}</span>
                            )}
                          </li>
                        )}

                        {selectedSubmission.plant_conditions["Weed infestation"] && (
                          <li>
                            Weed infestation:
                            {selectedSubmission.plant_conditions.weedInfestationLevel && (
                              <span className="ml-2 font-medium">{selectedSubmission.plant_conditions.weedInfestationLevel}</span>
                            )}
                          </li>
                        )}

                        {selectedSubmission.plant_conditions["Disease symptoms"] && (
                          <li>
                            Disease symptoms:
                            <ul className="list-circle list-inside ml-4">
                              {Object.entries(selectedSubmission.plant_conditions.diseaseDetails || {}).map(([disease, selected]) => (
                                selected && <li key={disease}>{disease}</li>
                              ))}
                              {selectedSubmission.plant_conditions.otherDisease && (
                                <li>Other: {selectedSubmission.plant_conditions.otherDisease}</li>
                              )}
                            </ul>
                          </li>
                        )}

                        {selectedSubmission.plant_conditions.Other && (
                          <li>
                            Other condition:
                            {selectedSubmission.plant_conditions.otherConditionText && (
                              <span className="ml-2 font-medium">{selectedSubmission.plant_conditions.otherConditionText}</span>
                            )}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Trait Measurements Details */}
                  {selectedSubmission.trait_measurements && (
                    <div>
                      <strong>Trait Measurements:</strong>
                      <ul className="list-disc list-inside ml-4">
                        {selectedSubmission.trait_measurements.culm_length > 0 && (
                          <li>Culm Length: {selectedSubmission.trait_measurements.culm_length} cm</li>
                        )}
                        {selectedSubmission.trait_measurements.panicle_length > 0 && (
                          <li>Panicle Length: {selectedSubmission.trait_measurements.panicle_length} cm</li>
                        )}
                        {selectedSubmission.trait_measurements.panicles_per_hill > 0 && (
                          <li>Panicles per Hill: {selectedSubmission.trait_measurements.panicles_per_hill}</li>
                        )}
                        {selectedSubmission.trait_measurements.hills_observed > 0 && (
                          <li>Hills Observed: {selectedSubmission.trait_measurements.hills_observed}</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {selectedSubmission.notes && (
                    <div>
                      <strong>Notes:</strong>
                      <p className="mt-1 text-gray-700">
                        {selectedSubmission.notes}
                      </p>
                    </div>
                  )}

                  {selectedSubmission.images &&
                    selectedSubmission.images.length > 0 && (
                      <div>
                        <strong>Images:</strong>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedSubmission.images.map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`Submission Image ${index + 1}`}
                              className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                              onClick={() => window.open(image, "_blank")}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedSubmission.videos &&
                    selectedSubmission.videos.length > 0 && (
                      <div>
                        <strong>Videos:</strong>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedSubmission.videos.map((video, index) => (
                            <div
                              key={index}
                              className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer"
                              onClick={() => window.open(video, "_blank")}
                            >
                              <PlayCircle className="w-10 h-10 text-gray-600" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedSubmission.audio &&
                    selectedSubmission.audio.length > 0 && (
                      <div>
                        <strong>Audio:</strong>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedSubmission.audio.map((audio, index) => (
                            <div
                              key={index}
                              className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer"
                              onClick={() => window.open(audio, "_blank")}
                            >
                              <Music className="w-10 h-10 text-gray-600" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedSubmission.coordinates && (
                    <div>
                      <strong>Coordinates:</strong>
                      <p className="mt-1 text-gray-700">
                        Latitude: {selectedSubmission.coordinates.latitude},
                        Longitude: {selectedSubmission.coordinates.longitude}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 mt-6 border-t">
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
