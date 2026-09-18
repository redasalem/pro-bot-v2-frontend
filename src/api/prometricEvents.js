import api from "./api";

export const getPrometricEvents = async (filters = {}) => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value != null));
  const { data } = await api.get("api/v1/prometric-events", { params });
  return data.data?.events || [];
};

export const getPrometricSearchSettings = async () => {
  const { data } = await api.get("api/v1/admin-operations/prometric-search-settings");
  return data.data?.settings;
};

export const updatePrometricSearchSettings = async (settings) => {
  const { data } = await api.patch("api/v1/admin-operations/prometric-search-settings", settings);
  return data.data?.settings;
};
