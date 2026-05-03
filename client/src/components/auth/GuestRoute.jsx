import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const GuestRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (user) {
        // If user is already logged in, redirect them away from login/register
        // Redirect to admin if they are admin/worker, otherwise to home
        if (user.role === 'admin' || user.role === 'worker') {
            return <Navigate to="/admin" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

export default GuestRoute;
