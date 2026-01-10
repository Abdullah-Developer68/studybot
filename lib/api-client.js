import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api/",
  withCredentials: true,
});

const sendUserPrompt = async (prompt) => {
  if (!prompt) {
    throw new Error("Prompt is required");
  }
  try {
    const res = await api.post("chat", { prompt });
    return res;
  } catch (err) {
    console.error("Error sending prompt:", err);
    throw err; // re-throws the error so that the code that called this function can get it (similar to return but stops the execution of the code in which this function is used and shifts it to the catch block if it is used.)
  }
};

export { sendUserPrompt, api };
