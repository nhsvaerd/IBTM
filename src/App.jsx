import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider
} from 'react-router-dom';

import MainLayout from 'layouts/MainLayout.jsx';
import Create from './screens/Create.jsx';


const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<MainLayout />}>
      <Route index element={<div>Home</div>} />
      <Route path='/create' element={<Create />} />
    </Route>
  )
);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;