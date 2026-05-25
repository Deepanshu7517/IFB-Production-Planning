// import { useState, type BaseSyntheticEvent } from 'react';
// import { useNavigate } from 'react-router-dom';

// // const API_BASE = 'http://localhost:5001/api';
// // const API_BASE = `${window.location.protocol}//${window.location.hostname}:5001/api`;
// let currentHost = window.location.hostname;

// // If running inside the Tauri desktop wrapper, route traffic to the local sidecar
// if (currentHost === 'tauri.localhost') {
//   currentHost = 'localhost';
// }

// const API_BASE = `http://${currentHost}:5001/api`;

// const SignIn = () => {
//   const [Form, setForm] = useState<{ email: string; password: string }>({
//     email: '',
//     password: '',
//   });
//   const [Loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);
//   const navigate = useNavigate();

//   const handleSubmit = async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       const res = await fetch(`${API_BASE}/production-auth/login`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(Form),
//       });
//       const data = await res.json();
//       if (!res.ok || !data.success) throw new Error(data.message || 'Invalid credentials');

//       // ── Save user to localStorage so ProtectedRoute can verify session ──────
//       localStorage.setItem('production_user', JSON.stringify(data.user));

//       navigate('/production-planning');
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter') handleSubmit();
//   };

//   return (
//     <div className="h-screen flex items-center justify-center">
//       {Loading ? (
//         <span className="loading loading-spinner loading-xl" />
//       ) : (
//         <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-md border p-4">
//           <legend className="fieldset-legend text-3xl">Login</legend>

//           <label className="label">Email</label>
//           <input
//             type="email"
//             value={Form.email}
//             onChange={(e: BaseSyntheticEvent) =>
//               setForm({ ...Form, email: e.target.value })
//             }
//             onKeyDown={handleKeyDown}
//             className="input w-full"
//             placeholder="Email"
//           />

//           <label className="label">Password</label>
//           <input
//             type="password"
//             value={Form.password}
//             onChange={(e: BaseSyntheticEvent) =>
//               setForm({ ...Form, password: e.target.value })
//             }
//             onKeyDown={handleKeyDown}
//             className="input w-full"
//             placeholder="Password"
//           />

//           {error && (
//             <p className="text-error text-sm mt-2 font-medium">{error}</p>
//           )}

//           <button onClick={handleSubmit} className="btn btn-neutral mt-4">
//             Login
//           </button>
//         </fieldset>
//       )}
//     </div>
//   );
// };

// export default SignIn;
// src/pages/SignIn.tsx
import { useState, type BaseSyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../config/api'; // <-- Import the centralized variable here

const SignIn = () => {
  const [Form, setForm] = useState<{ email: string; password: string }>({
    email: '',
    password: '',
  });
  const [Loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      // API_BASE is automatically injected here and guaranteed to be correct
      const res = await fetch(`${API_BASE}/production-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Invalid credentials');

      localStorage.setItem('production_user', JSON.stringify(data.user));

      navigate('/production-planning');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="h-screen flex items-center justify-center bg-base-100">
      {Loading ? (
        <span className="loading loading-spinner loading-xl" />
      ) : (
        <fieldset className="fieldset bg-base-100 border-base-300 rounded-box w-md border p-4 shadow-sm">
          <legend className="fieldset-legend text-3xl">Login</legend>

          <label className="label">Email</label>
          <input
            type="email"
            value={Form.email}
            onChange={(e: BaseSyntheticEvent) =>
              setForm({ ...Form, email: e.target.value })
            }
            onKeyDown={handleKeyDown}
            className="input w-full bg-base-100"
            placeholder="Email"
          />

          <label className="label">Password</label>
          <input
            type="password"
            value={Form.password}
            onChange={(e: BaseSyntheticEvent) =>
              setForm({ ...Form, password: e.target.value })
            }
            onKeyDown={handleKeyDown}
            className="input w-full bg-base-100"
            placeholder="Password"
          />

          {error && (
            <p className="text-error text-sm mt-2 font-medium">{error}</p>
          )}

          <button onClick={handleSubmit} className="btn btn-neutral mt-4">
            Login
          </button>
        </fieldset>
      )}
    </div>
  );
};

export default SignIn;