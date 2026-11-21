import React from 'react';
import { Layout } from './components/Layout';
import { QuickMileageModal } from './components/QuickMileageModal';
import { TireChangeModal } from './components/TireChangeModal';
import { TirePlanModal } from './components/TirePlanModal';
import { Toast } from './components/Toast';
import { VehicleGalleryModal } from './components/VehicleGalleryModal';
import { AppProvider, useApp } from './context/AppContext';
import { DashboardView } from './views/DashboardView';
import { DocumentsView } from './views/DocumentsView';
import { InsuranceView } from './views/InsuranceView';
import { LeasingView } from './views/LeasingView';
import { MaintenanceView } from './views/MaintenanceView';

const ActiveView: React.FC = () => {
  const { activeTab } = useApp();
  switch (activeTab) {
    case 'dashboard':
      return <DashboardView />;
    case 'insurance':
      return <InsuranceView />;
    case 'maintenance':
      return <MaintenanceView />;
    case 'leasing':
      return <LeasingView />;
    case 'documents':
      return <DocumentsView />;
  }
};

export function App() {
  return (
    <AppProvider>
      <Layout>
        <ActiveView />
      </Layout>
      <QuickMileageModal />
      <TireChangeModal />
      <TirePlanModal />
      <VehicleGalleryModal />
      <Toast />
    </AppProvider>
  );
}

export default App;
