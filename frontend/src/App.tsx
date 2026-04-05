import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CreateEvent from '@/pages/CreateEvent';
import EventPage from '@/pages/EventPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateEvent />} />
        <Route path="/event/:slug" element={<EventPage />} />
      </Routes>
    </BrowserRouter>
  );
}
