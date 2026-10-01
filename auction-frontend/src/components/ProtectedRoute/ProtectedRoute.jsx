import { Navigate } from 'react-router-dom';


/**children is not the tag itself. Instead, it is a special variable
 * that automatically contains everything that is sandwiched inside the opening and closing tags.
 */

const ProtectedRoute = ({ children, allowedRoles }) => {
    const username = sessionStorage.getItem("username");
    const role = sessionStorage.getItem("role");

    // Not logged in
    if (!username) {
        return <Navigate to="/" replace />;
    }

    // Logged in but wrong role
    if (allowedRoles && !allowedRoles.includes(role)) {
        if (role === "SELLER") {
            return <Navigate to="/seller-dashboard" replace />;
        }
        if (role === "ADMIN") {
            return <Navigate to="/admin-dashboard" replace />;
        }
        return <Navigate to="/properties" replace />;
    }

    return children;
};

export default ProtectedRoute;