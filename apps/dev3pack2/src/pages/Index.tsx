import React from 'react';
import { AppProvider, useApp } from '@/lib/appContext';
import Header from '@/components/Header';
import Onboarding from './Onboarding';
import Roadmap from './Roadmap';
import Challenge from './Challenge';
import Achievement from './Achievement';

function ScreenRouter() {
  const { screen } = useApp();

  switch (screen) {
    case 'onboarding':
      return <Onboarding />;
    case 'roadmap':
      return <Roadmap />;
    case 'challenge':
      return <Challenge />;
    case 'achievement':
      return <Achievement />;
    default:
      return <Onboarding />;
  }
}

export default function Index() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-background text-foreground font-mono">
        <Header />
        <ScreenRouter />
      </div>
    </AppProvider>
  );
}
