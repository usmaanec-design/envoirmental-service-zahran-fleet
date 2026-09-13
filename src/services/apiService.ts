import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000'; // Assuming a local development server for the backend

export const getProjects = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects`);
    return response.data;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

export const getSupervisorsByProjectId = async (projectId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/supervisors`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching supervisors for project ${projectId}:`, error);
    throw error;
  }
};

export const getForemenBySupervisorId = async (supervisorId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/supervisors/${supervisorId}/foremen`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching foremen for supervisor ${supervisorId}:`, error);
    throw error;
  }
};

export const getLabourByForemanId = async (foremanId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/foremen/${foremanId}/labour`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching labour for foreman ${foremanId}:`, error);
    throw error;
  }
};

// Placeholder for other API calls like Crew Man, Camp Labour, Officer if needed
export const getCrewMenByProjectId = async (projectId: string) => {
  try {
    // Assuming an API endpoint for crew men
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/crewmen`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching crew men for project ${projectId}:`, error);
    throw error;
  }
};

export const getCampLabourByProjectId = async (projectId: string) => {
  try {
    // Assuming an API endpoint for camp labour
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/camplabour`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching camp labour for project ${projectId}:`, error);
    throw error;
  }
};

export const getOfficersByProjectId = async (projectId: string) => {
  try {
    // Assuming an API endpoint for officers
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/officers`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching officers for project ${projectId}:`, error);
    throw error;
  }
};
