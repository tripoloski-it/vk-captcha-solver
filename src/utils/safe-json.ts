export const safeJSONParse = (data: string) => {
  try {
    return JSON.parse(data);
  } catch {
    return;
  }
};
