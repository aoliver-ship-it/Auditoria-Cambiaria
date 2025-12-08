
import React from 'react';
import { CalculatorIcon, InfoIcon, DuplicateIcon, ChartBarIcon, CheckIcon, ExclamationTriangleIcon } from './icons';

interface FileSummary {
    label: string;
    value: string;
}

interface SelectionSummary {
    vusd: { sum: number; count: number } | null;
    vusdi: { sum: number; count: number } | null;
}

interface XmlDashboardProps {
    totalLines: number;
    reviewedLines: number;
    pendingLines: number;
    filesCount: number;
}

const formatNumber = (num: number) => num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const DashboardXmlStats: React.FC<XmlDashboardProps> = ({ totalLines, reviewedLines, pendingLines, filesCount }) => {
    const percentage = totalLines > 0 ? Math.round((reviewedLines / totalLines) * 100) : 0;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-4 flex items-center justify-between gap-4 animate-fade-in-fast">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                    <ChartBarIcon className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-700">Dashboard de Revisión XML</h4>
                    <p className="text-xs text-slate-500">{filesCount} archivo(s) cargado(s)</p>
                </div>
            </div>

            <div className="flex gap-6 text-sm">
                <div className="text-center">
                    <p className="font-bold text-slate-800 text-lg">{totalLines}</p>
                    <p className="text-xs text-slate-500">Registros Totales</p>
                </div>
                <div className="text-center">
                    <p className="font-bold text-green-600 text-lg">{reviewedLines}</p>
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                        <CheckIcon className="w-3 h-3" /> Revisados
                    </p>
                </div>
                <div className="text-center">
                    <p className="font-bold text-amber-600 text-lg">{pendingLines}</p>
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                        <ExclamationTriangleIcon className="w-3 h-3" /> Pendientes
                    </p>
                </div>
            </div>

            <div className="w-48">
                <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">Progreso</span>
                    <span className="font-bold text-indigo-600">{percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export const FileSummaryView: React.FC<{ summary: FileSummary | null }> = ({ summary }) => {
    if (!summary) return null;

    return (
        <div className="fixed bottom-40 right-4 bg-white/80 backdrop-blur-md rounded-lg shadow-lg p-3 w-64 border border-slate-200 animate-fade-in-fast z-20">
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-full p-2">
                    <InfoIcon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-800">{summary.label}</p>
                    <p className="text-lg font-bold text-blue-600">{summary.value}</p>
                </div>
            </div>
        </div>
    );
};

export const SelectionSummaryView: React.FC<{ summary: SelectionSummary | null }> = ({ summary }) => {
    if (!summary) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white/80 backdrop-blur-md rounded-lg shadow-lg p-3 w-64 border border-slate-200 animate-fade-in-fast z-20">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-indigo-100 text-indigo-600 rounded-full p-2 mt-1">
                     <CalculatorIcon className="w-5 h-5" />
                </div>
                <div className="flex-grow">
                    <p className="text-sm font-semibold text-slate-800 mb-1">Resumen de Selección</p>
                    {summary.vusd && (
                        <div className="text-xs">
                            <span className="font-medium text-slate-600">Suma VUSD:</span>
                            <span className="font-bold text-indigo-600 float-right">{formatNumber(summary.vusd.sum)}</span>
                            <br/>
                            <span className="text-slate-500">({summary.vusd.count} items)</span>
                        </div>
                    )}
                    {summary.vusdi && (
                         <div className={`text-xs ${summary.vusd ? 'mt-1 pt-1 border-t border-slate-200' : ''}`}>
                             <span className="font-medium text-slate-600">Suma VUSDI:</span>
                             <span className="font-bold text-indigo-600 float-right">{formatNumber(summary.vusdi.sum)}</span>
                             <br/>
                             <span className="text-slate-500">({summary.vusdi.count} items)</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const DuplicateSummaryView: React.FC<{ summary: { totalVusd: number; totalVusdi: number; totalCount: number; groupCount: number; } | null }> = ({ summary }) => {
    if (!summary) return null;

    return (
        <div className="fixed bottom-4 left-4 bg-white/80 backdrop-blur-md rounded-lg shadow-lg p-3 w-72 border border-slate-200 animate-fade-in-fast z-20">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-amber-100 text-amber-600 rounded-full p-2 mt-1">
                    <DuplicateIcon className="w-5 h-5" />
                </div>
                <div className="flex-grow">
                    <p className="text-sm font-semibold text-slate-800 mb-1">Resumen de Duplicados</p>
                    <div className="text-xs space-y-1">
                        {(summary.totalVusd > 0 || (summary.totalVusd === 0 && summary.totalVusdi === 0)) && (
                            <div>
                                <span className="font-medium text-slate-600">Suma VUSD Total:</span>
                                <span className="font-bold text-amber-700 float-right">{formatNumber(summary.totalVusd)}</span>
                            </div>
                        )}
                        {summary.totalVusdi > 0 && (
                            <div>
                                <span className="font-medium text-slate-600">Suma VUSDI Total:</span>
                                <span className="font-bold text-amber-700 float-right">{formatNumber(summary.totalVusdi)}</span>
                            </div>
                        )}
                        <div className="!mt-2 border-t border-slate-200/60 pt-1">
                            <span className="text-slate-500">({summary.totalCount} items en {summary.groupCount} grupos)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
