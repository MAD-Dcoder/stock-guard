import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Welcome } from './pages/Welcome';
import { Dashboard } from './pages/Dashboard';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/painel" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
