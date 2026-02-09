import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AccountSettings from '../pages/AccountSettings';
import AuthLayout from '../components/auth/AuthLayout';
import SignUpLayout from '../components/auth/SignUpLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { Dashboard } from '../components/Dashboard';
import CreateCampaign from '../pages/CreateCampaign';
import CampaignDashboard from '../pages/CampaignDashboard';
import LeadScraper from '../pages/LeadScraper';
import Lists from '../pages/Lists';
import Inbox from '../pages/Inbox';
import EmailAccounts from '../pages/EmailAccounts';
import TestDeleteFunction from '../pages/TestDeleteFunction';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<AuthLayout />} />
      <Route path="/signup" element={<SignUpLayout />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/create-campaign" element={
        <ProtectedRoute>
          <CreateCampaign />
        </ProtectedRoute>
      } />

      <Route path="/campaign/:id" element={
        <ProtectedRoute>
          <CampaignDashboard />
        </ProtectedRoute>
      } />

      <Route path="/lead-scraper" element={
        <ProtectedRoute>
          <LeadScraper />
        </ProtectedRoute>
      } />

      <Route path="/lists" element={
        <ProtectedRoute>
          <Lists />
        </ProtectedRoute>
      } />

      <Route path="/inbox" element={
        <ProtectedRoute>
          <Inbox />
        </ProtectedRoute>
      } />

      <Route path="/email-accounts" element={
        <ProtectedRoute>
          <EmailAccounts />
        </ProtectedRoute>
      } />

      <Route path="/account-settings" element={
        <ProtectedRoute>
          <AccountSettings />
        </ProtectedRoute>
      } />

      <Route path="/test-delete-function" element={
        <ProtectedRoute>
          <TestDeleteFunction />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

export default AppRoutes;
