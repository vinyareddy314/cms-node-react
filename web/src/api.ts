export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://cms-node-api.onrender.com';

interface ApiOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const api = {
    async call<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers
            }
        });

        // Handle 204 No Content
        if (res.status === 204) {
            return {} as T;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Request failed');
        return data;
    }
};
