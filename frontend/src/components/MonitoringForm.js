import React, { useRef, useState } from "react";
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

/**
 * Image Uploader Component - Fixed Version
 * Handles image upload with drag-and-drop functionality
 */
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

  const handleFileUpload = (files) => {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        // Check video duration
        if (file.type.startsWith("video/")) {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            if (video.duration > 30) {
              alert('Video duration exceeds 30 seconds. Please upload a shorter video.');
            } else {
              onMediaUpload(file);
            }
          };
          video.src = URL.createObjectURL(file);
        } else {
          onMediaUpload(file);
        }
      } else {
        alert('Unsupported file type. Please upload an image or a video.');
      }
    });
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

const AudioRecorderUploader = ({ onAudioUpload, onRemoveAudio, audioFiles = [], loading = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const audioFileInputRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setAudioChunks([]);

      recorder.ondataavailable = (event) => {
        setAudioChunks((prev) => [...prev, event.data]);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          // Check duration (approximate for webm, more accurate for mp3/wav if converted)
          // For simplicity, we'll assume 1 minute max for now. More robust check would involve decoding.
          if (audioBlob.size / 1024 / 1024 > 1) { // Rough estimate: 1MB for 1 minute of audio
            alert('Audio duration exceeds 1 minute. Please record a shorter audio.');
          } else {
            onAudioUpload(audioBlob);
          }
        }
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (err) {
      alert('Error accessing microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleAudioFileUpload = (files) => {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("audio/")) {
        // For uploaded audio, we can't easily check duration client-side without decoding.
        // We'll rely on backend validation for now, or a more complex client-side library.
        onAudioUpload(file);
      } else {
        alert('Unsupported file type. Please upload an audio file.');
      }
    });
  };

  const handleButtonClick = () => {
    if (audioFileInputRef.current) {
      audioFileInputRef.current.click();
    }
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isRecording ? "border-red-400 bg-red-50" : "border-gray-300"
        } ${loading ? "opacity-50" : "hover:border-gray-400"}`}
      >
        <div className="flex justify-center mb-4">
          {!isRecording ? (
            <Button
              type="button"
              variant="primary"
              onClick={startRecording}
              disabled={loading}
              leftIcon={<Plus />}
            >
              Start Recording
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={stopRecording}
              disabled={loading}
              leftIcon={<X />}
            >
              Stop Recording
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={loading || isRecording}
            leftIcon={<Plus />}
            className="ml-2"
          >
            Upload Audio
          </Button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Record or upload audio • Max 1 minute
        </p>

        {/* Hidden file input */}
        <input
          ref={audioFileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={(e) => {
            if (e.target.files) {
              handleAudioFileUpload(e.target.files);
            }
          }}
          style={{ display: "none" }}
          disabled={loading || isRecording}
        />
      </div>

      {/* Display uploaded audio files */}
      {audioFiles.length > 0 && (
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {audioFiles.map((file, index) => (
            <div key={index} className="relative flex-shrink-0 w-32 group">
              <audio
                src={URL.createObjectURL(file)}
                controls
                className="w-full"
              />
              <button
                type="button"
                onClick={() => onRemoveAudio(file)}
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
 * Monitoring Form Component
 * Main form for collecting rice monitoring data
 *
 * @param {Object} props - Component properties
 * @param {function} props.onLogout - Function to handle user logout
 * @param {Object} props.currentUser - Current logged-in user data
 * @param {function} props.showToast - Function to show toast notifications
 * @param {function} props.onSubmissionSuccess - Callback when submission is successful
 */



const MonitoringForm = ({
  onLogout,
  currentUser,
  showToast,
  onSubmissionSuccess,
}) => {
 const {locations} = useLocations()
 console.log(locations)
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0], // Today's date
    location: "",
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
    images: [],
    videos: [],
    audio: [],
  });

  const [loading, setLoading] = useState(false);
  const [mediaUploadLoading, setMediaUploadLoading] = useState(false);
  const [audioUploadLoading, setAudioUploadLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

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
   * Handle image upload
   */
  const handleMediaUpload = (file) => {
    if (file.type.startsWith("image/")) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, file],
      }));
    } else if (file.type.startsWith("video/")) {
      setFormData((prev) => ({
        ...prev,
        videos: [...prev.videos, file],
      }));
    }
  };

  const handleRemoveMedia = (fileToRemove) => {
    if (fileToRemove.type.startsWith("image/")) {
      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((file) => file !== fileToRemove),
      }));
    } else if (fileToRemove.type.startsWith("video/")) {
      setFormData((prev) => ({
        ...prev,
        videos: prev.videos.filter((file) => file !== fileToRemove),
      }));
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
    }

    if (!formData.growthStage) {
      newErrors.growthStage = "Growth stage is required";
    }

    if (!currentUser?.name && !currentUser?.email) {
      newErrors.observer = "Observer information is missing";
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
      // 1. Request location permission and get location
      const location = await requestLocation();

      // 2. Create submission without media URLs
      const submissionData = {
        field_id: formData.location.trim(),
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
        observer_name: currentUser?.name || currentUser?.email || "Unknown",
        ...(location && { coordinates: location }),
      };

      const createResponse = await apiService.createSubmission(submissionData);

      if (!createResponse.success || !createResponse.data || !createResponse.data.id) {
        throw new Error(createResponse.message || "Failed to create submission or get submission ID");
      }

      const submissionId = createResponse.data.id;
      const imageUrls = [];
      const videoUrls = [];
      const audioUrls = [];

      // 3. Upload images, videos, and audio using the submissionId
      if (formData.images.length > 0 || formData.videos.length > 0 || formData.audio.length > 0) {
        setMediaUploadLoading(true);
        setAudioUploadLoading(true);

        const uploadPromises = [];

        formData.images.forEach((file) => {
          uploadPromises.push(apiService.uploadMedia(file, "image", submissionId));
        });

        formData.videos.forEach((file) => {
          uploadPromises.push(apiService.uploadMedia(file, "video", submissionId));
        });

        formData.audio.forEach((file) => {
          uploadPromises.push(apiService.uploadMedia(file, "audio", submissionId));
        });

        const responses = await Promise.all(uploadPromises);

        responses.forEach((response) => {
          if (response.success) {
            if (response.data.file_type === "image") {
              imageUrls.push(response.data.url);
            } else if (response.data.file_type === "video") {
              videoUrls.push(response.data.url);
            } else if (response.data.file_type === "audio") {
              audioUrls.push(response.data.url);
            }
          } else {
            console.error("Failed to upload a file:", response.message);
            // Do not throw error here, allow submission to proceed with partial media if some uploads fail
          }
        });

        setMediaUploadLoading(false);
        setAudioUploadLoading(false);
      }

      // 4. Update submission with media URLs
      if (imageUrls.length > 0 || videoUrls.length > 0 || audioUrls.length > 0) {
        const updateData = {
          images: imageUrls,
          videos: videoUrls,
          audio: audioUrls,
        };
        const updateResponse = await apiService.updateSubmission(submissionId, updateData);
        if (!updateResponse.success) {
          console.error("Failed to update submission with media URLs:", updateResponse.message);
          // Do not throw error here, allow submission to proceed even if update fails
        }
      }

      const response = await apiService.createSubmission(submissionData);

      if (response.success) {
        // Reset form
        setFormData({
          date: new Date().toISOString().split("T")[0],
          location: "",
          growthStage: "",
          plantConditions: {},
          measurements: {
            culmLength: "",
            panicleLength: "",
            paniclesPerHill: "",
            hillsObserved: "",
          },
          notes: "",
          images: [],
          videos: [],
          audio: [],
        });
        setUserLocation(null);
        setLocationError(null);

        if (showToast) {
          showToast("Submission created successfully!", "success");
        }

        if (onSubmissionSuccess) {
          onSubmissionSuccess();
        }
      } else {
        throw new Error(response.message || "Failed to create submission");
      }
    } catch (error) {
      if (showToast) {
        showToast("Failed to create submission: " + error.message, "error");
      }
    } finally {
      setLoading(false);
      setMediaUploadLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-4 py-6 text-white bg-gradient-to-r from-green-600 to-green-700">
       <div className="container mx-auto">
         <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Rice Field Monitor</h1>
            <p className="text-sm text-green-100">Data Collection Form</p>
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
      error={errors.location}
    >
      <Select
        value={formData.location}
        onChange={(e) => handleInputChange("location", e.target.value)}
        options={locations.map(loc => ({
          value: loc.id,
          label: `${loc.name} (${loc.location})`
        }))}
        placeholder="Select field location"
        error={errors.location}
      />
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
            onMediaUpload={handleMediaUpload}
            onRemoveMedia={(fileToRemove) => {
              if (fileToRemove.type.startsWith("image/")) {
                setFormData((prev) => ({
                  ...prev,
                  images: prev.images.filter((file) => file !== fileToRemove),
                }));
              } else if (fileToRemove.type.startsWith("video/")) {
                setFormData((prev) => ({
                  ...prev,
                  videos: prev.videos.filter((file) => file !== fileToRemove),
                }));
              }
            }}
            mediaFiles={[...formData.images, ...formData.videos]}
            loading={mediaUploadLoading}
          />
        </InputField>

        {/* Audio Record/Upload */}
        <InputField label="Voice Record / Upload" icon={Camera}>
          <AudioRecorderUploader
            onAudioUpload={(file) => {
              setFormData((prev) => ({
                ...prev,
                audio: [...prev.audio, file],
              }));
            }}
            onRemoveAudio={(fileToRemove) => {
              setFormData((prev) => ({
                ...prev,
                audio: prev.audio.filter((file) => file !== fileToRemove),
              }));
            }}
            audioFiles={formData.audio}
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

        {/* Observer Name - Read Only */}
        <InputField
          label="Observer Name / Team ID"
          icon={User}
          required
          hint="Observer name is automatically filled from your account"
        >
          <TextInput
            value={currentUser?.name || currentUser?.email || ""}
            disabled
            className="text-gray-600 cursor-not-allowed bg-gray-50"
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
          Submit Observation
        </Button>
      </form>
      </div>
     
    </div>
  );
};



export default MonitoringForm;
