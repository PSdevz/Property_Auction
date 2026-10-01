import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const useSessionGuard = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const username = sessionStorage.getItem("username");

        if (!username) {
            navigate('/');
            return;
        }

        const checkStatus = async () => {
            try {
                const res = await fetch(
                    `http://localhost:8080/api/auth/check?username=${username}`
                );

                if (!res.ok) {
                    const data = await res.json();
                    alert(data.reason || "Session invalid. Please log in again.");
                    sessionStorage.clear();
                    navigate('/');
                }
            } catch (err) {
                console.error("Session check failed:", err);
            }
        };

        // Check immediately on mount
        checkStatus();

        // Re-check every 30 seconds while page is open
        const interval = setInterval(checkStatus, 30000);

        return () => clearInterval(interval);
    }, [navigate]);
};

export default useSessionGuard;