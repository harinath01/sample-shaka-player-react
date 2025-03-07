import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    tpStreamData: null
};

const tpStreamSlice = createSlice({
    name: 'tpStream',
    initialState,
    reducers: {
        setTpStreamData: (state, action) => {
            state.tpStreamData = action.payload;
        }
    }
});

export const { setTpStreamData } = tpStreamSlice.actions;
export default tpStreamSlice.reducer; 