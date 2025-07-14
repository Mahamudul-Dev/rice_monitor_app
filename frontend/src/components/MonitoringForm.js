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
import InputField, { TextInput, TextArea, Checkbox } from "./common/InputField";
import Button from "./common/Button";
import apiService from "../services/apiService";

/**
 * Growth Stage Selector Component
 * Allows selection of rice growth stage from predefined options
 */
const GrowthStageSelector = ({ selected, onSelect }) => {
  const stages = [
    "Seedling",
    "Tillering",
    "Panicle Initiation",
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
const ImageUploader = ({ onImageUpload, images = [], loading = false }) => {
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
      if (file.type.startsWith("image/")) {
        onImageUpload(file);
      }
    });
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = (index) => {
    // This would need to be implemented to remove images
    console.log("Remove image at index:", index);
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
        <p className="mb-2 text-gray-600">Tap to capture or upload images</p>
        <p className="mb-4 text-sm text-gray-500">
          Multiple images supported • JPG, PNG, WebP
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
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
          {loading ? "Uploading..." : "Add Photos"}
        </Button>
      </div>

      {/* Display uploaded images */}
      {images.length > 0 && (
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {images.map((image, index) => (
            <div key={index} className="relative flex-shrink-0 w-32 group">
              <img
                src={image}
                alt={`Upload ${index + 1}`}
                className="object-contain w-full h-24 border rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
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
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0], // Today's date
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
  });

  const [loading, setLoading] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    setFormData((prev) => ({
      ...prev,
      plantConditions: {
        ...prev.plantConditions,
        [condition]: !prev.plantConditions[condition],
      },
    }));
  };

  /**
   * Handle image upload
   */
  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      if (showToast) {
        showToast("Please select a valid image file", "error");
      }
      return;
    }

    setImageUploadLoading(true);
    try {
      // For now, create a temporary submission ID for image upload
      const tempSubmissionId = "temp_" + Date.now();

      const response = await apiService.uploadImage(file, tempSubmissionId);

      if (response.success) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, response.data.url],
        }));

        if (showToast) {
          showToast("Image uploaded successfully", "success");
        }
      } else {
        throw new Error(response.message || "Failed to upload image");
      }
    } catch (error) {
      // console.error('Image upload error:', error);
      if (showToast) {
        showToast("Failed to upload image: " + error.message, "error");
      }
    } finally {
      setImageUploadLoading(false);
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
      const submissionData = {
        field_id: "default", // You might want to implement field selection
        date: new Date(formData.date).toISOString(),
        location: formData.location.trim(),
        growth_stage: formData.growthStage,
        plant_conditions: Object.keys(formData.plantConditions).filter(
          (key) => formData.plantConditions[key]
        ),
        trait_measurements: {
          culm_length: parseFloat(formData.measurements.culmLength) || 0,
          panicle_length: parseFloat(formData.measurements.panicleLength) || 0,
          panicles_per_hill:
            parseInt(formData.measurements.paniclesPerHill) || 0,
          hills_observed: parseInt(formData.measurements.hillsObserved) || 0,
        },
        notes: formData.notes.trim(),
        observer_name: currentUser?.name || currentUser?.email || "Unknown",
      };

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
        });

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
      // console.error('Submission error:', error);
      if (showToast) {
        showToast("Failed to create submission: " + error.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-4 py-6 text-white bg-gradient-to-r from-green-600 to-green-700">
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

      {/* Form Content */}
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
          <TextInput
            placeholder="Enter field location or plot number"
            value={formData.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
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

        {/* Image Upload */}
        <InputField label="Upload Images" icon={Camera}>
          <ImageUploader
            onImageUpload={handleImageUpload}
            images={formData.images}
            loading={imageUploadLoading}
          />
        </InputField>

        {/* Plant Condition */}
        <InputField label="Plant Condition" icon={Leaf}>
          <div className="space-y-1">
            {conditionOptions.map((condition) => (
              <Checkbox
                key={condition}
                label={condition}
                checked={formData.plantConditions[condition] || false}
                onChange={() => handleConditionChange(condition)}
              />
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
  );
};

export default MonitoringForm;
