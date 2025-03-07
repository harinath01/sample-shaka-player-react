import { configureStore } from '@reduxjs/toolkit';
import tpStreamReducer from './tpStreamSlice';

export const store = configureStore({
    reducer: {
        tpStream: tpStreamReducer,
    },
}); 