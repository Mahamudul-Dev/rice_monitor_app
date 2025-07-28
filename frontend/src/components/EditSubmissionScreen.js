import React, { useRef, useState, useEffect } from "react";
import {
  LogOut,
  Calendar,
  MapPin,
  Camera,
  Leaf,
  Ruler,
  FileText,
  User,
  Plus,
  X,
  Loader,
} from "lucide-react";
import InputField, { TextInput, TextArea, Checkbox, Select } from "./common/InputField";
import Button from "./common/Button";
import apiService from "../services/apiService";
import { useLocations } from "../hooks/useLocations";
import { AudioRecorderUploader } from "./AudioRecorder";

/**
 * Growth Stage Selector Component
 * Allows selection of rice growth stage from predefined options
 */
const GrowthStageSelector = ({ selected, onSelect }) => {
  const stages = [
    "Seedling",
    "Tillering",
    "Panicle",
    "Booting",
    "Heading",
    "Flowering",
    "Milk Stage",
    "Dough Stage",
    "Maturity",
    "Harvested",
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stages.map((stage) => (
        <button
          key={stage}
          type="button"
          onClick={() => onSelect(stage)}
          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
            selected === stage
              ? "border-green-600 bg-green-50 text-green-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          {stage}
        </button>
      ))}
    </div>
  );
};



const MediaUploader = ({ onMediaUpload, onRemoveMedia, mediaFiles = [], loading = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const checkVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (files) => {
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        onMediaUpload(file);
      } else if (file.type.startsWith("video/")) {
        try {
          const duration = await checkVideoDuration(file);
          if (duration > 30) {
            alert('Video duration exceeds 30 seconds. Please upload a shorter video.');
          } else {
            onMediaUpload(file);
          }
        } catch (err) {
          console.error('Error checking video duration:', err);
          // Fallback - check file size if duration check fails
          if (file.size > 50 * 1024 * 1024) { // 50MB
            alert('Video file is too large. Max 30 seconds allowed.');
          } else {
            onMediaUpload(file);
          }
        }
      } else {
        alert('Unsupported file type. Please upload an image or a video.');
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? "border-green-400 bg-green-50" : "border-gray-300"
        } ${loading ? "opacity-50" : "hover:border-green-400"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="mb-2 text-gray-600">Tap to capture or upload images/videos</p>
        <p className="mb-4 text-sm text-gray-500">
          Multiple files supported • JPG, PNG, WebP, MP4, MOV (max 30s)
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/mp4,video/quicktime"
          onChange={(e) => {
            if (e.target.files) {
              handleFileUpload(e.target.files);
            }
          }}
          style={{ display: "none" }}
          disabled={loading}
        />

        {/* Button to trigger file input */}
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={loading}
          leftIcon={loading ? <Loader className="animate-spin" /> : <Plus />}
        >
          {loading ? "Uploading..." : "Add Files"}
        </Button>
      </div>

      {/* Display uploaded media files */}
      {mediaFiles.length > 0 && (
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {mediaFiles.map((file, index) => (
            <div key={index} className="relative flex-shrink-0 w-32 group">
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="object-contain w-full h-24 border rounded-lg"
                />
              ) : (
                <video
                  src={URL.createObjectURL(file)}
                  controls
                  className="object-contain w-full h-24 border rounded-lg"
                />
              )}
              <button
                type="button"
                onClick={() => onRemoveMedia(file)}
                className="absolute p-1 text-white transition-opacity bg-red-500 rounded-full opacity-0 top-1 right-1 hover:bg-red-600 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};





/**
 * Edit Submission Form Component
 * Main form for editing rice monitoring data
 *
 * @param {Object} props - Component properties
 * @param {function} props.onLogout - Function to handle user logout
 * @param {Object} props.currentUser - Current logged-in user data
 * @param {function} props.showToast - Function to show toast notifications
 * @param {function} props.onSubmissionUpdated - Callback when submission is updated successfully
 * @param {string} props.submissionId - ID of the submission to edit
 * @param {function} props.onBack - Function to navigate back to submissions list
 */
const EditSubmissionScreen = ({
  onLogout,
  currentUser,
  showToast,
  onSubmissionUpdated,
  submissionId,
  onBack,
}) => {
  const { locations } = useLocations();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    location: "",
    otherFieldName: "",
    growthStage: "",
    plantConditions: {
      Healthy: false,
      Unhealthy: false,
      "Signs of pest infestation": false,
      pestDetails: {},
      otherPest: "",
      "Signs of nutrient deficiency": false,
      nutrientDeficiencyDetails: {},
      otherNutrient: "",
      "Water stress (drought or flood)": false,
      waterStressLevel: "",
      "Lodging (bent/broken stems)": false,
      lodgingLevel: "",
      "Weed infestation": false,
      weedInfestationLevel: "",
      "Disease symptoms": false,
      diseaseDetails: {},
      otherDisease: "",
      Other: false,
      otherConditionText: "",
    },
    measurements: {
      culmLength: "",
      panicleLength: "",
      paniclesPerHill: "",
      hillsObserved: "",
    },
    notes: "",
    newImages: [],
    newVideos: [],
    newAudio: [],
    existingImages: [],
    existingVideos: [],
    existingAudio: [],
  });

  const [loading, setLoading] = useState(true);
  const [mediaUploadLoading, setMediaUploadLoading] = useState(false);
  const [audioUploadLoading, setAudioUploadLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    const fetchSubmissionData = async () => {
      if (!submissionId) {
        setLoading(false);
        showToast("No submission ID provided for editing.", "error");
        onBack();
        return;
      }

      try {
        const response = await apiService.getSubmission(submissionId);
        if (response.success && response.data) {
          const data = response.data;
          const initialFormData = {
            date: new Date(data.date).toISOString().split("T")[0],
            location: data.field_id,
            otherFieldName: data.other_field_name || "",
            growthStage: data.growth_stage,
            plantConditions: {
              Healthy: data.plant_conditions?.Healthy || false,
              Unhealthy: data.plant_conditions?.Unhealthy || false,
              "Signs of pest infestation": data.plant_conditions?.["Signs of pest infestation"] || false,
              pestDetails: data.plant_conditions?.pestDetails || {},
              otherPest: data.plant_conditions?.otherPest || "",
              "Signs of nutrient deficiency": data.plant_conditions?.["Signs of nutrient deficiency"] || false,
              nutrientDeficiencyDetails: data.plant_conditions?.nutrientDeficiencyDetails || {},
              otherNutrient: data.plant_conditions?.otherNutrient || "",
              "Water stress (drought or flood)": data.plant_conditions?.["Water stress (drought or flood)"] || false,
              waterStressLevel: data.plant_conditions?.waterStressLevel || "",
              "Lodging (bent/broken stems)": data.plant_conditions?.["Lodging (bent/broken stems)"] || false,
              lodgingLevel: data.plant_conditions?.lodgingLevel || "",
              "Weed infestation": data.plant_conditions?.["Weed infestation"] || false,
              weedInfestationLevel: data.plant_conditions?.weedInfestationLevel || "",
              "Disease symptoms": data.plant_conditions?.["Disease symptoms"] || false,
              diseaseDetails: data.plant_conditions?.diseaseDetails || {},
              otherDisease: data.plant_conditions?.otherDisease || "",
              Other: data.plant_conditions?.Other || false,
              otherConditionText: data.plant_conditions?.otherConditionText || "",
            },
            measurements: {
              culmLength: data.trait_measurements?.culm_length || "",
              panicleLength: data.trait_measurements?.panicle_length || "",
              paniclesPerHill: data.trait_measurements?.panicles_per_hill || "",
              hillsObserved: data.trait_measurements?.hills_observed || "",
            },
            notes: data.notes || "",
            newImages: [],
            newVideos: [],
            newAudio: [],
            existingImages: data.images || [],
            existingVideos: data.videos || [],
            existingAudio: data.audio || [],
          };

          if (data.other_field_name) {
            initialFormData.location = "others";
          }

          setFormData(initialFormData);
          setUserLocation(data.coordinates || null);
        } else {
          showToast(response.message || "Failed to load submission data.", "error");
          onBack();
        }
      } catch (error) {
        showToast("Error fetching submission data: " + error.message, "error");
        onBack();
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionData();
  }, [submissionId, showToast, onBack]);

  const requestLocation = () => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        if (showToast) {
          showToast("Geolocation is not supported by your browser.", "error");
        }
        return resolve(null);
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(location);
          resolve(location);
        },
        (error) => {
          let errorMessage = "An unknown error occurred.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location access denied. Please enable it in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "The request to get user location timed out.";
              break;
          }
          if (showToast) {
            showToast(errorMessage, "error");
          }
          setLocationError(errorMessage);
          resolve(null); // Resolve with null to allow submission without location
        }
      );
    });
  };

  const conditionOptions = [
    "Healthy",
    "Unhealthy",
    "Signs of pest infestation",
    "Signs of nutrient deficiency",
    "Water stress (drought or flood)",
    "Lodging (bent/broken stems)",
    "Weed infestation",
    "Disease symptoms",
    "Other",
  ];

  const pestOptions = [
    "Rice stem borers",
    "Brown plant hooper",
    "Rice mealybug",
    "Unknown",
    "Others",
  ];

  const nutrientDeficiencyOptions = [
    "Nitrogen",
    "Phosphorus",
    "Potassium",
    "Zinc",
    "Unknown",
    "Others",
  ];

  const diseaseOptions = [
    "False smut",
    "Blast",
    "Sheath blight",
    "Panicle blight",
    "Bacterial Blight",
    "Unknown",
    "Others",
  ];

  const waterStressOptions = ["High", "Medium", "Low"];

  const handlePestDetailChange = (pest) => {
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        pestDetails: {
          ...prev.plantConditions.pestDetails,
          [pest]: !prev.plantConditions.pestDetails?.[pest],
        },
      },
    }));
  };

  const handleOtherPestChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        otherPest: value,
      },
    }));
  };

  const handleNutrientDetailChange = (nutrient) => {
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        nutrientDeficiencyDetails: {
          ...prev.plantConditions.nutrientDeficiencyDetails,
          [nutrient]: !prev.plantConditions.nutrientDeficiencyDetails?.[nutrient],
        },
      },
    }));
  };

  const handleOtherNutrientChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        otherNutrient: value,
      },
    }));
  };

  const handleWaterStressChange = (level) => {
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        waterStressLevel: level,
      },
    }));
  };

  const handleLodgingChange = (level) => {
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        lodgingLevel: level,
      },
    }));
  };

  const handleWeedInfestationChange = (level) => {
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        weedInfestationLevel: level,
      },
    }));
  };

  const handleDiseaseDetailChange = (disease) => {
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        diseaseDetails: {
          ...prev.plantConditions.diseaseDetails,
          [disease]: !prev.plantConditions.diseaseDetails?.[disease],
        },
      },
    }));
  };

  const handleOtherDiseaseChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        otherDisease: value,
      },
    }));
  };

  const handleOtherConditionChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        otherConditionText: value,
      },
    }));
  };

  /**
   * Handle form field changes
   */
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "location" && value !== "others") {
      setFormData((prev) => ({
        ...prev,
        otherFieldName: "",
      }));
    }

    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  /**
   * Handle measurement field changes
   */
  const handleMeasurementChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [field]: value,
      },
    }));
  };

  /**
   * Handle plant condition checkbox changes
   */
  const handleConditionChange = (condition) => {
    setFormData((prev) => {
      const newConditions = { ...prev.plantConditions };

      // Toggle the selected condition
      newConditions[condition] = !newConditions[condition];

      // Enforce mutual exclusivity for Healthy/Unhealthy
      if (condition === "Healthy" && newConditions.Healthy) {
        newConditions.Unhealthy = false;
      } else if (condition === "Unhealthy" && newConditions.Unhealthy) {
        newConditions.Healthy = false;
      }

      // Clear pest details if "Signs of pest infestation" is unchecked
      if (condition === "Signs of pest infestation" && !newConditions["Signs of pest infestation"]) {
        newConditions.pestDetails = {};
        newConditions.otherPest = "";
      }
      
      // Clear nutrient deficiency details if "Signs of nutrient deficiency" is unchecked
      if (condition === "Signs of nutrient deficiency" && !newConditions["Signs of nutrient deficiency"]) {
        newConditions.nutrientDeficiencyDetails = {};
        newConditions.otherNutrient = "";
      }

      // Clear water stress details if "Water stress (drought or flood)" is unchecked
      if (condition === "Water stress (drought or flood)" && !newConditions["Water stress (drought or flood)"]) {
        newConditions.waterStressLevel = "";
      }

      // Clear lodging details if "Lodging (bent/broken stems)" is unchecked
      if (condition === "Lodging (bent/broken stems)" && !newConditions["Lodging (bent/broken stems)"]) {
        newConditions.lodgingLevel = "";
      }

      // Clear weed infestation details if "Weed infestation" is unchecked
      if (condition === "Weed infestation" && !newConditions["Weed infestation"]) {
        newConditions.weedInfestationLevel = "";
      }

      // Clear disease details if "Disease symptoms" is unchecked
      if (condition === "Disease symptoms" && !newConditions["Disease symptoms"]) {
        newConditions.diseaseDetails = {};
        newConditions.otherDisease = "";
      }

      // Clear other condition text if "Other" is unchecked
      if (condition === "Other" && !newConditions.Other) {
        newConditions.otherConditionText = "";
      }

      return {
        ...prev,
        plantConditions: newConditions,
      };
    });
  };

  /**
   * Handle new media upload
   */
  const handleNewMediaUpload = (file) => {
    if (file.type.startsWith("image/")) {
      setFormData((prev) => ({
        ...prev,
        newImages: [...prev.newImages, file],
      }));
    } else if (file.type.startsWith("video/")) {
      setFormData((prev) => ({
        ...prev,
        newVideos: [...prev.newVideos, file],
      }));
    }
  };

  const handleRemoveNewMedia = (fileToRemove) => {
    if (fileToRemove.type.startsWith("image/")) {
      setFormData((prev) => ({
        ...prev,
        newImages: prev.newImages.filter((file) => file !== fileToRemove),
      }));
    } else if (fileToRemove.type.startsWith("video/")) {
      setFormData((prev) => ({
        ...prev,
        newVideos: prev.newVideos.filter((file) => file !== fileToRemove),
      }));
    }
  };

  const handleRemoveExistingMedia = async (urlToRemove) => {
    try {
      await apiService.deleteMedia(urlToRemove);
      setFormData((prev) => ({
        ...prev,
        existingImages: prev.existingImages.filter((url) => url !== urlToRemove),
        existingVideos: prev.existingVideos.filter((url) => url !== urlToRemove),
      }));
      showToast("Media deleted successfully!", "success");
    } catch (error) {
      showToast("Failed to delete media: " + error.message, "error");
    }
  };

  const handleNewAudioUpload = (file) => {
    setFormData((prev) => ({
      ...prev,
      newAudio: [...prev.newAudio, file],
    }));
  };

  const handleRemoveNewAudio = (fileToRemove) => {
    setFormData((prev) => ({
      ...prev,
      newAudio: prev.newAudio.filter((file) => file !== fileToRemove),
    }));
  };

  const handleRemoveExistingAudio = async (urlToRemove) => {
    try {
      await apiService.deleteMedia(urlToRemove);
      setFormData((prev) => ({
        ...prev,
        existingAudio: prev.existingAudio.filter((url) => url !== urlToRemove),
      }));
      showToast("Audio deleted successfully!", "success");
    } catch (error) {
      showToast("Failed to delete audio: " + error.message, "error");
    }
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    } else if (formData.location === "others" && !formData.otherFieldName.trim()) {
      newErrors.otherFieldName = "Please specify the field name";
    }

    if (!formData.growthStage) {
      newErrors.growthStage = "Growth stage is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      if (showToast) {
        showToast("Please fill in all required fields", "error");
      }
      return;
    }

    setLoading(true);

    try {
      // 1. Request location permission and get location if not already available
      let currentCoordinates = userLocation;
      if (!currentCoordinates) {
        currentCoordinates = await requestLocation();
      }

      // 2. Upload new images, videos, and audio
      const uploadedImageUrls = [];
      const uploadedVideoUrls = [];
      const uploadedAudioUrls = [];

      if (formData.newImages.length > 0 || formData.newVideos.length > 0 || formData.newAudio.length > 0) {
        setMediaUploadLoading(true);
        setAudioUploadLoading(true);

        const uploadPromises = [];

        formData.newImages.forEach((file) => {
          uploadPromises.push(apiService.uploadMedia(file, "image", submissionId));
        });

        formData.newVideos.forEach((file) => {
          uploadPromises.push(apiService.uploadMedia(file, "video", submissionId));
        });

        formData.newAudio.forEach((file) => {
          console.log(file)
          uploadPromises.push(apiService.uploadMedia(file, "audio", submissionId));
        });

        const responses = await Promise.all(uploadPromises);

        responses.forEach((response) => {
          if (response.success) {
            if (response.data.file_type === "image") {
              uploadedImageUrls.push(response.data.url);
            } else if (response.data.file_type === "video") {
              uploadedVideoUrls.push(response.data.url);
            } else if (response.data.file_type === "audio") {
              uploadedAudioUrls.push(response.data.url);
            }
          } else {
            console.error("Failed to upload a file:", response.message);
            showToast(`Failed to upload a file: ${response.message}`, "error");
          }
        });

        setMediaUploadLoading(false);
        setAudioUploadLoading(false);
      }

      // Combine existing and newly uploaded media URLs
      const finalImageUrls = [...formData.existingImages, ...uploadedImageUrls];
      const finalVideoUrls = [...formData.existingVideos, ...uploadedVideoUrls];
      const finalAudioUrls = [...formData.existingAudio, ...uploadedAudioUrls];

      // 3. Prepare update payload
      const updatePayload = {
        field_id: formData.location.trim(),
        ...(formData.location === "others" && { other_field_name: formData.otherFieldName.trim() }),
        date: new Date(formData.date).toISOString(),
        growth_stage: formData.growthStage,
        plant_conditions: {
          Healthy: formData.plantConditions.Healthy || false,
          Unhealthy: formData.plantConditions.Unhealthy || false,
          "Signs of pest infestation": formData.plantConditions["Signs of pest infestation"] || false,
          pestDetails: formData.plantConditions.pestDetails || {},
          otherPest: formData.plantConditions.otherPest || "",
          "Signs of nutrient deficiency": formData.plantConditions["Signs of nutrient deficiency"] || false,
          nutrientDeficiencyDetails: formData.plantConditions.nutrientDeficiencyDetails || {},
          otherNutrient: formData.plantConditions.otherNutrient || "",
          "Water stress (drought or flood)": formData.plantConditions["Water stress (drought or flood)"] || false,
          waterStressLevel: formData.plantConditions.waterStressLevel || "",
          "Lodging (bent/broken stems)": formData.plantConditions["Lodging (bent/broken stems)"] || false,
          lodgingLevel: formData.plantConditions.lodgingLevel || "",
          "Weed infestation": formData.plantConditions["Weed infestation"] || false,
          weedInfestationLevel: formData.plantConditions.weedInfestationLevel || "",
          "Disease symptoms": formData.plantConditions["Disease symptoms"] || false,
          diseaseDetails: formData.plantConditions.diseaseDetails || {},
          otherDisease: formData.plantConditions.otherDisease || "",
          Other: formData.plantConditions.Other || false,
          otherConditionText: formData.plantConditions.otherConditionText || "",
        },
        trait_measurements: {
          culm_length: parseFloat(formData.measurements.culmLength) || 0,
          panicle_length: parseFloat(formData.measurements.panicleLength) || 0,
          panicles_per_hill:
            parseInt(formData.measurements.paniclesPerHill) || 0,
          hills_observed: parseInt(formData.measurements.hillsObserved) || 0,
        },
        notes: formData.notes.trim(),
        images: finalImageUrls,
        videos: finalVideoUrls,
        audio: finalAudioUrls,
        ...(currentCoordinates && { coordinates: currentCoordinates }),
      };

      // 4. Call update API
      const response = await apiService.updateSubmission(submissionId, updatePayload);

      if (response.success) {
        if (showToast) {
          showToast("Submission updated successfully!", "success");
        }
        if (onSubmissionUpdated) {
          onSubmissionUpdated();
        }
        onBack(); // Navigate back after successful update
      } else {
        throw new Error(response.message || "Failed to update submission");
      }
    } catch (error) {
      if (showToast) {
        showToast("Failed to update submission: " + error.message, "error");
      }
    } finally {
      setLoading(false);
      setMediaUploadLoading(false);
      setAudioUploadLoading(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (window.confirm("Are you sure you want to delete this submission? This action cannot be undone.")) {
      setLoading(true);
      try {
        const response = await apiService.deleteSubmission(submissionId);
        if (response.success) {
          showToast("Submission deleted successfully!", "success");
          if (onSubmissionUpdated) {
            onSubmissionUpdated(); // Trigger a refresh of the submissions list
          }
          onBack(); // Navigate back to submissions list
        } else {
          throw new Error(response.message || "Failed to delete submission");
        }
      } catch (error) {
        showToast("Failed to delete submission: " + error.message, "error");
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-8 h-8 mx-auto mb-4 text-green-600 animate-spin" />
          <p className="text-gray-600">Loading submission for editing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-4 py-6 text-white bg-gradient-to-r from-green-600 to-green-700">
       <div className="container mx-auto">
         <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Edit Submission</h1>
            <p className="text-sm text-green-100">Modify existing monitoring data</p>
          </div>
          <button
            onClick={onBack}
            className="p-2 transition-colors rounded-lg hover:bg-green-500"
            title="Back to Submissions"
          >
            <X className="w-5 h-5 text-green-100" />
          </button>
        </div>
       </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto">
 <form onSubmit={handleSubmit} className="flex-1 p-4 pb-20">
        {/* Date of Observation */}
        <InputField
          label="Date of Observation"
          icon={Calendar}
          required
          error={errors.date}
        >
          <TextInput
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange("date", e.target.value)}
            error={errors.date}
            max={new Date().toISOString().split("T")[0]} // Cannot select future dates
          />
        </InputField>

        {/* Location */}
        <InputField
          label="Location of Field"
          icon={MapPin}
          required
          error={errors.location || errors.otherFieldName}
        >
          <Select
            value={formData.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            options={[
              ...locations.map((loc) => ({
                value: loc.id,
                label: `${loc.name} (${loc.location})`,
              })),
              { value: "others", label: "Others" },
            ]}
            placeholder="Select field location"
            error={errors.location}
          />
          {formData.location === "others" && (
            <div className="mt-4">
              <TextInput
                placeholder="Please specify field name"
                value={formData.otherFieldName}
                onChange={(e) =>
                  handleInputChange("otherFieldName", e.target.value)
                }
                error={errors.otherFieldName}
              />
            </div>
          )}
        </InputField>

        {/* Growth Stage */}
        <InputField
          label="Growth Stage of Rice"
          icon={Leaf}
          required
          error={errors.growthStage}
        >
          <GrowthStageSelector
            selected={formData.growthStage}
            onSelect={(stage) => handleInputChange("growthStage", stage)}
          />
          {errors.growthStage && (
            <p className="mt-2 text-sm text-red-600">{errors.growthStage}</p>
          )}
        </InputField>

        {/* Image/Video Upload */}
        <InputField label="Upload Files (Images/Videos)" icon={Camera}>
          <MediaUploader
            onMediaUpload={handleNewMediaUpload}
            onRemoveMedia={handleRemoveNewMedia}
            mediaFiles={[...formData.newImages, ...formData.newVideos]}
            existingMedia={[...formData.existingImages, ...formData.existingVideos]}
            loading={mediaUploadLoading}
          />
        </InputField>

        {/* Audio Record/Upload */}
        <InputField label="Voice Record / Upload" icon={Camera}>
          <AudioRecorderUploader
            onAudioUpload={handleNewAudioUpload}
            onRemoveAudio={handleRemoveNewAudio}
            audioFiles={formData.newAudio}
            existingAudio={formData.existingAudio}
            loading={audioUploadLoading}
          />
        </InputField>

        {/* Plant Condition */}
        <InputField label="Plant Condition" icon={Leaf}>
          <div className="space-y-1">
            {conditionOptions.map((condition) => (
              <div key={condition}>
                <Checkbox
                  label={condition}
                  checked={formData.plantConditions[condition] || false}
                  onChange={() => handleConditionChange(condition)}
                  disabled={
                    (condition === "Unhealthy" && formData.plantConditions.Healthy) ||
                    (condition === "Healthy" && formData.plantConditions.Unhealthy)
                  }
                />
                {condition === "Signs of pest infestation" &&
                  formData.plantConditions["Signs of pest infestation"] && (
                    <div className="pl-6 mt-2 space-y-1 border-l-2 border-gray-200 ml-3">
                      {pestOptions.map((pest) => (
                        <div key={pest}>
                          <Checkbox
                            label={pest}
                            checked={formData.plantConditions.pestDetails?.[pest] || false}
                            onChange={() => handlePestDetailChange(pest)}
                          />
                          {pest === "Others" &&
                            formData.plantConditions.pestDetails?.Others && (
                              <div className="mt-2 ml-6">
                                <TextInput
                                  placeholder="Please specify other pest"
                                  value={formData.plantConditions.otherPest || ""}
                                  onChange={(e) =>
                                    handleOtherPestChange(e.target.value)
                                  }
                                />
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                  {condition === "Signs of nutrient deficiency" &&
                  formData.plantConditions["Signs of nutrient deficiency"] && (
                    <div className="pl-6 mt-2 space-y-1 border-l-2 border-gray-200 ml-3">
                      {nutrientDeficiencyOptions.map((nutrient) => (
                        <div key={nutrient}>
                          <Checkbox
                            label={nutrient}
                            checked={formData.plantConditions.nutrientDeficiencyDetails?.[nutrient] || false}
                            onChange={() => handleNutrientDetailChange(nutrient)}
                          />
                          {nutrient === "Others" &&
                            formData.plantConditions.nutrientDeficiencyDetails?.Others && (
                              <div className="mt-2 ml-6">
                                <TextInput
                                  placeholder="Please specify other nutrient deficiency"
                                  value={formData.plantConditions.otherNutrient || ""}
                                  onChange={(e) =>
                                    handleOtherNutrientChange(e.target.value)
                                  }
                                />
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                  {condition === "Water stress (drought or flood)" &&
                    formData.plantConditions["Water stress (drought or flood)"] && (
                      <div className="pl-6 mt-2 space-y-1 border-l-2 border-gray-200 ml-3">
                        <div className="flex items-center space-x-4">
                          {waterStressOptions.map((level) => (
                            <label key={level} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="waterStressLevel"
                                value={level}
                                checked={formData.plantConditions.waterStressLevel === level}
                                onChange={() => handleWaterStressChange(level)}
                                className="form-radio h-4 w-4 text-green-600 transition duration-150 ease-in-out"
                              />
                              <span>{level}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  {condition === "Lodging (bent/broken stems)" &&
                    formData.plantConditions["Lodging (bent/broken stems)"] && (
                      <div className="pl-6 mt-2 space-y-1 border-l-2 border-gray-200 ml-3">
                        <div className="flex items-center space-x-4">
                          {waterStressOptions.map((level) => (
                            <label key={level} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="lodgingLevel"
                                value={level}
                                checked={formData.plantConditions.lodgingLevel === level}
                                onChange={() => handleLodgingChange(level)}
                                className="form-radio h-4 w-4 text-green-600 transition duration-150 ease-in-out"
                              />
                              <span>{level}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  {condition === "Weed infestation" &&
                    formData.plantConditions["Weed infestation"] && (
                      <div className="pl-6 mt-2 space-y-1 border-l-2 border-gray-200 ml-3">
                        <div className="flex items-center space-x-4">
                          {waterStressOptions.map((level) => (
                            <label key={level} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="weedInfestationLevel"
                                value={level}
                                checked={formData.plantConditions.weedInfestationLevel === level}
                                onChange={() => handleWeedInfestationChange(level)}
                                className="form-radio h-4 w-4 text-green-600 transition duration-150 ease-in-out"
                              />
                              <span>{level}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  {condition === "Disease symptoms" &&
                    formData.plantConditions["Disease symptoms"] && (
                      <div className="pl-6 mt-2 space-y-1 border-l-2 border-gray-200 ml-3">
                        {diseaseOptions.map((disease) => (
                          <div key={disease}>
                            <Checkbox
                              label={disease}
                              checked={formData.plantConditions.diseaseDetails?.[disease] || false}
                              onChange={() => handleDiseaseDetailChange(disease)}
                            />
                            {disease === "Others" &&
                              formData.plantConditions.diseaseDetails?.Others && (
                                <div className="mt-2 ml-6">
                                  <TextInput
                                    placeholder="Please specify other disease"
                                    value={formData.plantConditions.otherDisease || ""}
                                    onChange={(e) =>
                                      handleOtherDiseaseChange(e.target.value)
                                    }
                                  />
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  {condition === "Other" && formData.plantConditions.Other && (
                    <div className="mt-2 ml-6">
                      <TextInput
                        placeholder="Please specify other condition"
                        value={formData.plantConditions.otherConditionText || ""}
                        onChange={(e) =>
                          handleOtherConditionChange(e.target.value)
                        }
                      />
                    </div>
                  )}
              </div>
            ))}
          </div>
        </InputField>

        {/* Trait Measurements */}
        <InputField label="Trait Measurements (Optional)" icon={Ruler}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm text-gray-600">
                Culm Length (cm)
              </label>
              <TextInput
                type="number"
                placeholder="0"
                min="0"
                step="0.1"
                value={formData.measurements.culmLength}
                onChange={(e) =>
                  handleMeasurementChange("culmLength", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-600">
                Panicle Length (cm)
              </label>
              <TextInput
                type="number"
                placeholder="0"
                min="0"
                step="0.1"
                value={formData.measurements.panicleLength}
                onChange={(e) =>
                  handleMeasurementChange("panicleLength", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-600">
                Panicles per Hill
              </label>
              <TextInput
                type="number"
                placeholder="0"
                min="0"
                step="1"
                value={formData.measurements.paniclesPerHill}
                onChange={(e) =>
                  handleMeasurementChange("paniclesPerHill", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-600">
                Hills Observed
              </label>
              <TextInput
                type="number"
                placeholder="0"
                min="0"
                step="1"
                value={formData.measurements.hillsObserved}
                onChange={(e) =>
                  handleMeasurementChange("hillsObserved", e.target.value)
                }
              />
            </div>
          </div>
        </InputField>

        {/* Observation Notes */}
        <InputField label="Visual Observation Notes" icon={FileText}>
          <TextArea
            placeholder="Describe any visible changes, stress signs, or pest presence..."
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            rows={4}
          />
        </InputField>

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          loading={loading}
          className="mt-6"
          leftIcon={<FileText />}
        >
          Update Observation
        </Button>
        <Button
          type="button"
          fullWidth
          variant="danger"
          onClick={handleDeleteSubmission}
          loading={loading}
          className="mt-4"
        >
          Delete Submission
        </Button>
      </form>
      </div>
     
    </div>
  );
};

export default EditSubmissionScreen;
