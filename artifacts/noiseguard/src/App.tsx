import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NoiseGuardApp } from '@/components/NoiseGuardApp';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NoiseGuardApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;