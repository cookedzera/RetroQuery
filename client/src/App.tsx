import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Terminal from "@/pages/terminal";
import LangChainDemo from "@/pages/langchain-demo";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Terminal} />
      <Route path="/langchain" component={LangChainDemo} />
      <Route component={Terminal} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
