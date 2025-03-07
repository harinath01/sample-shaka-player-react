import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import TP from './components/TP';
import './App.css';

function App() {
  // Example stream data - replace with your actual data
  const sampleData = {
    data: {
      playback_url: "https://d1p88m4giad8m0.cloudfront.net/transcoded/6EXY8M6ANFE/video.m3u8",
      dash_url: "https://d1p88m4giad8m0.cloudfront.net/transcoded/6EXY8M6ANFE/video.mpd",
      access_token: "3f7e4b29-541f-4cf9-bc17-f15d2d066b63",
      asset_id: "6EXY8M6ANFE"
    }
  };

  return (
    <Provider store={store}>
      <div className="App">
        <main>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <TP data={sampleData} />
          </div>
        </main>
      </div>
    </Provider>
  );
}

export default App;
