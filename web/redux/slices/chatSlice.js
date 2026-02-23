import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  query: "",
  response: "",
  currentExchange: { query: "", response: "" },
  chatHistory: [],
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    sendResponse: (state, action) => {
      state.response = action.payload.reFsponse;
      state.currentExchange.response = action.payload.response;
    },
    storeQuery: (state, action) => {
      state.query = action.payload.query;
      state.currentExchange.query = action.payload.query;
    },
    addToChatHistory: (state) => {
      // store the current exchange in chat history. Spread operator is used to create a new object to avoid reference issues.
      // If we just pushed state.currentExchange directly, any future changes to currentExchange would also affect the entries in chatHistory.
      state.chatHistory.push({ ...state.currentExchange });
      // reset current exchange
      state.currentExchange = { query: "", response: "" };
    },
  },
});

export const { sendResponse, storeQuery, addToChatHistory } = chatSlice.actions;
export default chatSlice.reducer;
