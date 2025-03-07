import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import TP from './components/TP';
import './App.css';

function App() {
  // Example stream data - replace with your actual data
  const sampleData = {
    data: {
      playback_url: "https://d384padtbeqfgy.cloudfront.net/transcoded/AgAFNEJn3kt/video.m3u8",
      dash_url: "https://d384padtbeqfgy.cloudfront.net/transcoded/AgAFNEJn3kt/video.mpd",
      access_token: "f9b11692-78c5-4d14-9385-5f1efb0b8f4e",
      asset_id: "AgAFNEJn3kt",
      org_id: "6eafqn"
    }
  };

  return (
    <Provider store={store}>
      <div className="App">
        <main>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <TP data={sampleData} orgId={sampleData.data.org_id} />
          </div>
        </main>
      </div>
    </Provider>
  );
}

export default App;
