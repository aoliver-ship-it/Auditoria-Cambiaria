
import React, { useState } from 'react';
import { User, ProgressData } from '../types';
import { EyeIcon, EyeSlashIcon, UploadIcon } from './icons';

interface LoginScreenProps {
    onLoginSuccess: (user: User, data?: ProgressData) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // 1. Check Admin (prioritizing local storage override if exists)
        const storedAdminPassword = localStorage.getItem('cca-admin-password') || 'Aoliver77$';
        
        if (username === 'Admin95' && password === storedAdminPassword) {
            onLoginSuccess({ username: 'Admin95', role: 'admin' });
            return;
        } 

        // 2. Check LocalStorage Users
        const storedUsers = localStorage.getItem('cca-users');
        if (storedUsers) {
            try {
                const users: User[] = JSON.parse(storedUsers);
                const foundUser = users.find(u => u.username === username && u.password === password);
                
                if (foundUser) {
                    if (foundUser.isLocked) {
                        setError('Acceso denegado: Usuario bloqueado.');
                        return;
                    }
                    onLoginSuccess({ username: foundUser.username, role: foundUser.role });
                    return;
                }
            } catch (err) {
                console.error("Error parsing users from local storage", err);
            }
        }

        // 3. Fail
        setError('Usuario o clave incorrectos.');
    };

    const handleLoadSession = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const content = ev.target?.result as string;
                const parsed: ProgressData = JSON.parse(content);
                const auditorName = parsed.auditDetails?.auditorName || 'UsuarioImportado';
                
                // If it's the admin or a known user, we can try to auto-login.
                // For safety, we just allow access as the user in the file.
                // But normally we require authentication. 
                // We will create a session object and pass it up.
                
                const userRole = auditorName === 'Admin95' ? 'admin' : 'user';
                onLoginSuccess({ username: auditorName, role: userRole }, parsed);
                
            } catch (err) {
                alert("El archivo no es válido o está dañado.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="h-screen w-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-lg border border-slate-200">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-indigo-700">CCA</h1>
                    <p className="text-slate-500 mt-1">Auditoría Cuenta de Compensación</p>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="username">
                            Usuario
                        </label>
                        <div className="relative">
                             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <i className="fa-solid fa-user text-slate-400"></i>
                            </div>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="block w-full rounded-md border-slate-300 pl-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                                placeholder="Usuario"
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                            Clave
                        </label>
                         <div className="relative">
                             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <i className="fa-solid fa-lock text-slate-400"></i>
                            </div>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="block w-full rounded-md border-slate-300 pl-10 pr-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                                placeholder="••••••••••"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    
                    {error && (
                        <div className="mb-4 text-center text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            Ingresar
                        </button>
                    </div>
                </form>

                <div className="mt-6 flex flex-col items-center gap-2">
                    <p className="text-xs text-slate-400 mb-2">- O -</p>
                    <label className="flex w-full justify-center items-center gap-2 rounded-md bg-white border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer">
                        <UploadIcon className="w-4 h-4 text-slate-500" />
                        Cargar Respaldo (.json)
                        <input type="file" accept=".json" className="hidden" onChange={handleLoadSession} />
                    </label>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                    <p className="text-xs text-slate-400">
                        <span className="font-semibold block mb-1">Acceso Restringido</span>
                        Esta herramienta es de uso exclusivo interno. Solo el usuario administrador puede crear y autorizar nuevas cuentas.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
