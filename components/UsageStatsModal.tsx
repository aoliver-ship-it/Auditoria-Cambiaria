
import React, { useState, useEffect, useMemo } from 'react';
import { ActivityLog, User } from '../types';
import { CloseIcon, ClockIcon } from './icons';

interface UsageStatsModalProps {
    onClose: () => void;
    currentUser: User;
}

const UsageStatsModal: React.FC<UsageStatsModalProps> = ({ onClose, currentUser }) => {
    const [activityLog, setActivityLog] = useState<ActivityLog>({});
    const [selectedUser, setSelectedUser] = useState<string>(currentUser.role === 'admin' ? 'all' : currentUser.username);
    const [usersList, setUsersList] = useState<string[]>([]);

    useEffect(() => {
        // 1. Load Activity Logs
        const logs = localStorage.getItem('cca-activity-logs');
        let parsedLogs: ActivityLog = {};
        if (logs) {
            try {
                parsedLogs = JSON.parse(logs);
                setActivityLog(parsedLogs);
            } catch (e) {
                console.error("Error loading activity logs", e);
            }
        }

        // 2. Load Registered Users to ensure everyone appears in the list, even with 0 activity
        const storedUsers = localStorage.getItem('cca-users');
        const allUsersSet = new Set<string>();

        // Always ensure Admin is in the list
        allUsersSet.add('Admin95');

        // Add registered users from DB
        if (storedUsers) {
            try {
                const parsedUsers: User[] = JSON.parse(storedUsers);
                parsedUsers.forEach(u => allUsersSet.add(u.username));
            } catch (e) {
                console.error("Error loading users for stats", e);
            }
        }

        // Add users found in logs (in case they were deleted but have history)
        Object.keys(parsedLogs).forEach(u => allUsersSet.add(u));

        setUsersList(Array.from(allUsersSet).sort());

    }, []);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = today.substring(0, 7); // YYYY-MM
        
        // Helper to get ISO week number (YYYY-Www)
        const getWeek = (dateStr: string) => {
            const date = new Date(dateStr);
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
            return `${d.getUTCFullYear()}-W${weekNo}`;
        };
        const currentWeek = getWeek(today);

        let totalMinutesToday = 0;
        let totalMinutesMonth = 0;
        let daysInMonth = new Set<string>();
        let daysInWeek = new Set<string>();

        const usersToProcess = selectedUser === 'all' ? Object.keys(activityLog) : [selectedUser];

        usersToProcess.forEach(user => {
            const userLogs = activityLog[user];
            if (!userLogs) return;

            Object.entries(userLogs).forEach(([date, value]) => {
                const minutes = value as number;
                // Today
                if (date === today) {
                    totalMinutesToday += minutes;
                }

                // Monthly
                if (date.startsWith(currentMonth)) {
                    totalMinutesMonth += minutes;
                    daysInMonth.add(date + user); // Unique per user-day if aggregating 'all', or just date if single user. 
                    // Actually request says "conteo por usuario", so if viewing "all", maybe we shouldn't aggregate heavily? 
                    // Let's assume if viewing "all", we show a summary table instead.
                    // But for the top cards, let's aggregate based on selected context.
                }

                // Weekly
                if (getWeek(date) === currentWeek) {
                    daysInWeek.add(date + user);
                }
            });
        });

        // Correction for days sets: if 'all' is selected, we might want unique days across everyone or sum of days worked by everyone?
        // "días por semana y total horas y días al mes utilizados" implies effort.
        // If 2 users work on Monday, is it 1 day or 2 man-days? Usually 2 man-days in audit contexts.
        // My Set logic `date + user` counts man-days. 
        
        return {
            todayHours: (totalMinutesToday / 60).toFixed(1),
            monthHours: (totalMinutesMonth / 60).toFixed(1),
            monthDays: daysInMonth.size,
            weekDays: daysInWeek.size
        };

    }, [activityLog, selectedUser]);

    const userDetailedStats = useMemo(() => {
        if (selectedUser !== 'all') return null;
        
        // Generate summary per user
        return usersList.map(user => {
            const userLogs = activityLog[user] || {};
            let totalMin = 0;
            let totalDays = 0;
            
            Object.values(userLogs).forEach(m => totalMin += (m as number));
            totalDays = Object.keys(userLogs).length;

            return {
                username: user,
                totalHours: (totalMin / 60).toFixed(1),
                totalDays
            };
        });
    }, [activityLog, usersList, selectedUser]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <header className="flex-shrink-0 p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <ClockIcon className="w-6 h-6 text-indigo-600" /> Estadísticas de Uso
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                </header>

                <main className="flex-grow overflow-auto p-6 space-y-6">
                    
                    {/* Filter (Admin only) */}
                    {currentUser.role === 'admin' && (
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <label className="text-sm font-medium text-slate-700">Ver estadísticas de:</label>
                            <select 
                                value={selectedUser} 
                                onChange={(e) => setSelectedUser(e.target.value)}
                                className="text-sm border-slate-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">Todos los Usuarios</option>
                                {usersList.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                            <p className="text-sm text-blue-600 font-medium mb-1">Horas Hoy</p>
                            <p className="text-3xl font-bold text-blue-800">{stats.todayHours} h</p>
                        </div>
                         <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                            <p className="text-sm text-green-600 font-medium mb-1">Días Trabajados (Semana Actual)</p>
                            <p className="text-3xl font-bold text-green-800">{stats.weekDays}</p>
                        </div>
                         <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
                            <p className="text-sm text-indigo-600 font-medium mb-1">Horas Totales (Mes Actual)</p>
                            <p className="text-3xl font-bold text-indigo-800">{stats.monthHours} h</p>
                        </div>
                         <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                            <p className="text-sm text-purple-600 font-medium mb-1">Días Totales (Mes Actual)</p>
                            <p className="text-3xl font-bold text-purple-800">{stats.monthDays}</p>
                        </div>
                    </div>

                    {/* Detailed Table for Admin View 'All' */}
                    {selectedUser === 'all' && userDetailedStats && (
                        <div className="mt-6">
                            <h4 className="font-bold text-slate-800 mb-3">Resumen General por Usuario</h4>
                            <div className="overflow-hidden border border-slate-200 rounded-lg">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600">Usuario</th>
                                            <th className="px-4 py-3 text-right font-medium text-slate-600">Total Días</th>
                                            <th className="px-4 py-3 text-right font-medium text-slate-600">Total Horas (Histórico)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {userDetailedStats.map(stat => (
                                            <tr key={stat.username} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 font-medium text-slate-800">{stat.username}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">{stat.totalDays}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">{stat.totalHours}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default UsageStatsModal;
