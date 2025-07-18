// API Configuration
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8080/api/v1";

class ApiService {
  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem("access_token");    
    console.log(token);
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Helper method to handle responses
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "network_error",
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || "An error occurred");
    }
    return response.json();
  }

  // Authentication methods
  async googleLogin(token) {
    console.log("token", token);
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return this.handleResponse(response);
  }

  async refreshToken(refreshToken) {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return this.handleResponse(response);
  }

  async logout() {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Submissions methods
  async getSubmissions(params = {}) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${API_BASE_URL}/submissions?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createSubmission(submissionData) {
    const response = await fetch(`${API_BASE_URL}/submissions`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(submissionData),
    });
    return this.handleResponse(response);
  }

  async getSubmission(id) {
    const response = await fetch(`${API_BASE_URL}/submissions/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateSubmission(id, updateData) {
    const response = await fetch(`${API_BASE_URL}/submissions/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    return this.handleResponse(response);
  }

  async deleteSubmission(id) {
    const response = await fetch(`${API_BASE_URL}/submissions/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async exportSubmissions() {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_BASE_URL}/submissions/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Failed to export submissions");
    }

    return response.blob(); // Return blob for CSV download
  }

  // Image methods
  async uploadImage(file, submissionId) {
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("image", file);
    formData.append("submission_id", submissionId);

    const response = await fetch(`${API_BASE_URL}/images/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return this.handleResponse(response);
  }

  async deleteImage(filename) {
    const response = await fetch(`${API_BASE_URL}/images/${filename}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Fields methods
  async getFields() {
    const response = await fetch(`${API_BASE_URL}/fields`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createField(fieldData) {
    const response = await fetch(`${API_BASE_URL}/fields`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(fieldData),
    });
    return this.handleResponse(response);
  }

  async getField(id) {
    const response = await fetch(`${API_BASE_URL}/fields/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateField(id, updateData) {
    const response = await fetch(`${API_BASE_URL}/fields/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    return this.handleResponse(response);
  }

  async deleteField(id) {
    const response = await fetch(`${API_BASE_URL}/fields/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Analytics methods
  async getDashboardData() {
    const response = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getTrends(params = {}) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(
      `${API_BASE_URL}/analytics/trends?${queryParams}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async getReports(params = {}) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(
      `${API_BASE_URL}/analytics/reports?${queryParams}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return this.handleResponse(response);
  }


  // User methods
  async getUser(id) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateUser(id, updateData) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    return this.handleResponse(response);
  }


  async deleteUser(id) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
