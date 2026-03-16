// src/components/RouteGuard.jsx
import { Navigate } from 'react-router-dom';
import { AuthServisi } from '../api/authService';

const RouteGuard = ({ children, allowedRoles }) => {
    const kullanici = AuthServisi.getKullanici();
    const token = AuthServisi.getToken();

    if (!token || !kullanici) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(kullanici.rol)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default RouteGuard;
