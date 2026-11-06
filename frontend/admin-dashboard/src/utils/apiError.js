export const apiError = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.detail) return data.detail;
  if (data && typeof data === "object") {
    const message = Object.values(data)
      .flat()
      .filter((value) => typeof value === "string" && value.trim())
      .join(" ");
    if (message) return message;
  }
  return error?.message || fallback;
};
