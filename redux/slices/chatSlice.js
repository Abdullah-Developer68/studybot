import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messages: [],
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    sendMessage: (state, action) => {},
  },
});

export const { sendMessage } = chatSlice.actions;
export default chatSlice.reducer;
