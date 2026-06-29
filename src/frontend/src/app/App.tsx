import { RouterProvider } from 'react-router-dom';
import QueryProvider from './providers/QueryProvider';
import StoreProvider from './providers/StoreProvider';
import ThemeProvider from './providers/ThemeProvider';
import { router } from './router';

export default function App() {
  return (
    <QueryProvider>
      <StoreProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </StoreProvider>
    </QueryProvider>
  );
}
