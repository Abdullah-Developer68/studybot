import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  openTemplate: false,
  newTemplate: false,
};

const templateSlice = createSlice({
  name: "template",
  initialState,
  reducers: {
    createNewTemplate: (state) => {
      state.newTemplate = !state.newTemplate;
    },
  },
});

export default templateSlice.reducer;
export const { createNewTemplate } = templateSlice.actions;
