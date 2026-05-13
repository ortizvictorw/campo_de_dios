import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Users, Search, RefreshCw, ZoomIn, ZoomOut, Maximize, LayoutGrid, List, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Seat {
  tableId: number;
  seatId: number;
  occupied: boolean;
  name?: string;
}

interface TableData {
  id: number;
  seats: boolean[]; // true if occupied
  names: (string | undefined)[];
}

// --- API Helper ---
const fetchSeats = async () => {
  const res = await fetch('/api/seats');
  if (!res.ok) throw new Error('Failed to fetch seats');
  return res.json();
};

const toggleSeat = async (tableId: number, seatId: number, occupied: boolean, name?: string) => {
  const res = await fetch('/api/seats/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId, seatId, occupied, name }),
  });
  if (!res.ok) throw new Error('Failed to toggle seat');
  return res.json();
};

const resetSeats = async () => {
  const res = await fetch('/api/seats/reset', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset seats');
  return res.json();
};

// --- Components ---

interface SeatProps {
  key?: React.Key;
  displayNumber: number;
  occupied: boolean;
  onClick: () => void;
  angle: number;
  highlight?: boolean;
}

const SeatComponent = React.memo(({ 
  displayNumber,
  occupied, 
  onClick, 
  angle, 
  highlight 
}: SeatProps) => {
  const radius = 22; // Adjusted for smaller table from theme
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute w-3.5 h-3.5 rounded-full border border-black/10 cursor-pointer flex items-center justify-center text-[6px] font-bold z-20 transition-all active:scale-90 will-change-transform ${
        occupied 
          ? 'bg-rose-500 border-rose-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]' 
          : 'bg-emerald-500 border-emerald-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
      } ${highlight ? 'ring-2 ring-yellow-400 ring-offset-1 scale-125 z-30' : 'hover:scale-125'}`}
      style={{
        left: `calc(50% + ${x}px - 7.5px)`, // Adjusted centering
        top: `calc(50% + ${y}px - 7.5px)`,
      }}
    >
      {displayNumber}
    </button>
  );
});

SeatComponent.displayName = 'SeatComponent';

interface TableProps {
  key?: React.Key;
  tableId: number;
  seats: boolean[];
  names: (string | undefined)[];
  onToggle: (seatId: number) => void;
  highlightCount?: number;
  highlightName?: string;
  onBulkAssign?: (tableId: number) => void;
  selectedSeats?: Set<string>;
}

const TableComponent = React.memo(({ 
  tableId, 
  seats, 
  names,
  onToggle, 
  highlightCount,
  highlightName,
  onBulkAssign,
  selectedSeats
}: TableProps) => {
  const freeSeats = seats.filter(s => !s).length;
  
  const matchType = useMemo(() => {
    if (!highlightCount || freeSeats < highlightCount) return 'none';
    if (freeSeats === highlightCount) return 'perfect';
    if (freeSeats < 10) return 'partial';
    return 'empty';
  }, [freeSeats, highlightCount]);
  
  const canFit = matchType !== 'none';
  
  const hasMatchedName = useMemo(() => {
    if (!highlightName) return false;
    return names.some(n => n?.toLowerCase().includes(highlightName.toLowerCase()));
  }, [names, highlightName]);

  return (
    <div className="relative flex flex-col items-center">
      <div 
        className={`relative w-14 h-14 flex items-center justify-center rounded-full bg-white border-2 shadow-lg transition-all duration-300 z-10 ${
          canFit || hasMatchedName 
            ? matchType === 'perfect' 
              ? 'border-blue-500 bg-blue-50 scale-125 ring-4 ring-blue-100 shadow-blue-200' 
              : matchType === 'partial'
                ? 'border-emerald-500 bg-emerald-50 scale-110 shadow-emerald-100'
                : 'border-emerald-400 bg-white scale-105 shadow-stone-100'
            : 'border-stone-300'
        }`}
      >
        <span className={`text-[10px] font-bold ${
          matchType === 'perfect' ? 'text-blue-700' : (canFit || hasMatchedName ? 'text-emerald-700' : 'text-stone-400')
        }`}>
          M-{(tableId + 1).toString().padStart(2, '0')}
        </span>
        
        <div className="absolute w-20 h-20 pointer-events-none">
          <div className="relative w-full h-full pointer-events-auto">
            {Array.from({ length: 10 }).map((_, i) => {
              const isMatch = highlightName && names[i]?.toLowerCase().includes(highlightName.toLowerCase());
              const globalId = tableId * 10 + i + 1;
              const isSelected = selectedSeats?.has(`${tableId}-${i}`);
              
              let seatHighlight = false;
              if (isMatch) seatHighlight = true;
              else if (canFit && !seats[i]) {
                seatHighlight = true;
              }

              return (
                <SeatComponent
                  key={i}
                  displayNumber={globalId}
                  angle={(i * 36 * Math.PI) / 180}
                  occupied={seats[i] || false}
                  onClick={() => onToggle(i)}
                  highlight={seatHighlight || isSelected}
                />
              );
            })}
          </div>
        </div>
      </div>
      {(canFit || hasMatchedName) && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter shadow-sm ${
            matchType === 'perfect' 
              ? 'bg-blue-600 text-white animate-bounce' 
              : hasMatchedName 
                ? 'bg-emerald-100 text-emerald-800' 
                : matchType === 'partial'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {hasMatchedName ? 'Vip' : matchType === 'perfect' ? '¡Ideal!' : matchType === 'partial' ? 'Casi Llena' : 'Disponible'}
        </motion.div>
      )}

      {(matchType === 'perfect' || (matchType === 'empty' && highlightCount)) && onBulkAssign && (
        <motion.button 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            onBulkAssign(tableId);
          }}
          className={`mt-2 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg z-20 transition-all whitespace-nowrap border border-white active:scale-95 ${
            matchType === 'perfect' 
              ? 'bg-blue-600 shadow-blue-200 hover:bg-blue-700' 
              : 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'
          }`}
        >
          {matchType === 'perfect' ? 'Asignar Todo' : `Asignar ${highlightCount}`}
        </motion.button>
      )}
    </div>
  );
});

TableComponent.displayName = 'TableComponent';

export default function App() {
  const [seatsData, setSeatsData] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupSize, setGroupSize] = useState<number>(0);
  const [personSearch, setPersonSearch] = useState<string>('');
  const [searchActive, setSearchActive] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<{tableId: number, seatId: number} | null>(null);
  const [tempName, setTempName] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedListItems, setSelectedListItems] = useState<Set<string>>(new Set());
  const [bulkFamilyName, setBulkFamilyName] = useState('');
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when selection pops up
  useEffect(() => {
    if (selectedListItems.size > 0) {
      const timer = setTimeout(() => {
        bulkInputRef.current?.focus();
      }, 400); 
      return () => clearTimeout(timer);
    }
  }, [selectedListItems.size]);

  const handleBulkSave = async () => {
    if (selectedListItems.size === 0 || !bulkFamilyName.trim()) return;
    
    setLoading(true);
    try {
      const promises = Array.from(selectedListItems).map((id: string) => {
        const [tId, sId] = id.split('-').map(Number);
        return toggleSeat(tId, sId, true, bulkFamilyName);
      });
      
      await Promise.all(promises);
      await loadData();
      setSelectedListItems(new Set());
      setBulkFamilyName('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (tableId: number, seatId: number) => {
    const id = `${tableId}-${seatId}`;
    setSelectedListItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMapBulkAssign = (tableId: number) => {
    const currentTable = tableData[tableId];
    if (!currentTable) return;
    
    const freeSeatIDs: string[] = [];
    currentTable.seats.forEach((occupied, seatId) => {
      if (!occupied && (!groupSize || freeSeatIDs.length < groupSize)) {
        freeSeatIDs.push(`${tableId}-${seatId}`);
      }
    });
    
    setSelectedListItems(new Set(freeSeatIDs));
    setBulkFamilyName('');
  };

  // Initialize and poll
  const loadData = useCallback(async () => {
    try {
      const data = await fetchSeats();
      setSeatsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [loadData]);

  // Group data by table
  const tableData = useMemo(() => {
    const t: Record<number, { seats: boolean[], names: (string | undefined)[] }> = {};
    // Init all tables
    for (let i = 0; i < 66; i++) {
      t[i] = {
        seats: Array(10).fill(false),
        names: Array(10).fill(undefined)
      };
    }
    
    seatsData.forEach(s => {
      if (t[s.tableId]) {
        t[s.tableId].seats[s.seatId] = s.occupied;
        t[s.tableId].names[s.seatId] = s.name;
      }
    });
    return t;
  }, [seatsData]);

  const handleSeatClick = (tableId: number, seatId: number) => {
    const seat = seatsData.find(s => s.tableId === tableId && s.seatId === seatId);
    setTempName(seat?.name || personSearch || '');
    setSelectedSeat({ tableId, seatId });
  };

  const handleDirectSave = async (tableId: number, seatId: number, occupied: boolean, name: string) => {
    // Optimistic update
    setSeatsData(prev => {
      const existing = prev.find(s => s.tableId === tableId && s.seatId === seatId);
      if (existing) {
        return prev.map(s => (s.tableId === tableId && s.seatId === seatId ? { ...s, occupied, name } : s));
      }
      return [...prev, { tableId, seatId, occupied, name }];
    });

    try {
      await toggleSeat(tableId, seatId, occupied, name);
      if (selectedSeat?.tableId === tableId && selectedSeat?.seatId === seatId) {
        setSelectedSeat(null);
      }
    } catch (err) {
      console.error(err);
      loadData(); // Revert
    }
  };

  const handleSaveSeat = async (occupied: boolean) => {
    if (!selectedSeat) return;
    await handleDirectSave(selectedSeat.tableId, selectedSeat.seatId, occupied, tempName);
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      await resetSeats();
      setSeatsData([]);
      setShowResetConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Stats for the sidebar
  const stats = useMemo(() => {
    const total = 660;
    const occupied = seatsData.filter(s => s.occupied).length;
    const free = total - occupied;
    const percent = Math.round((free / total) * 100);
    return { total, occupied, free, percent };
  }, [seatsData]);

  return (
    <div className="flex flex-col h-screen bg-stone-50 text-stone-900 font-sans overflow-hidden">
      {/* Header Section */}
      <header className="h-auto sm:h-20 bg-white border-b border-stone-200 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between py-3 sm:py-0 shadow-sm z-50">
        <div className="flex items-center justify-between w-full sm:w-auto mb-3 sm:mb-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-serif italic text-lg sm:text-xl shadow-lg shadow-emerald-100 shrink-0">C</div>
            <h1 className="text-xs sm:text-lg font-black tracking-[0.1em] sm:tracking-[0.2em] text-emerald-950 uppercase truncate">
              Campo de Dios <span className="text-emerald-500 font-medium ml-1 opacity-50 hidden sm:inline">Manager</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5 sm:hidden">
            <button 
              onClick={() => setShowStats(!showStats)}
              className="p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-500 active:bg-stone-100"
            >
              <Users size={16} />
            </button>
            <button 
              onClick={() => loadData()}
              className="p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-500 active:bg-stone-100"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-500 active:bg-rose-100"
              title="Reiniciar todo"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center bg-stone-100 rounded-lg p-1 border border-stone-200 w-full sm:w-auto">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none p-1.5 rounded-md flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <List size={14} />
              <span>Lista</span>
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`flex-1 sm:flex-none p-1.5 rounded-md flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <LayoutGrid size={14} />
              <span>Mapa</span>
            </button>
          </div>

          <div className="flex flex-1 sm:flex-none items-center bg-stone-100 rounded-lg p-1 border border-stone-200 shadow-inner">
            <div className="flex items-center border-r border-stone-200 pr-1 sm:pr-2">
              <input 
                type="number" 
                min={0}
                value={groupSize || ''}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value));
                  setGroupSize(isNaN(val) ? 0 : val);
                  setSearchActive(val > 0);
                }}
                placeholder="G"
                className="w-10 sm:w-12 h-8 bg-transparent text-center text-xs font-black text-emerald-700 outline-none"
              />
            </div>
            <div className="flex-1 flex items-center pl-2 sm:pl-3 relative min-w-0">
              <Search size={14} className="text-stone-400 shrink-0" />
              <input 
                type="text"
                value={personSearch}
                onChange={(e) => setPersonSearch(e.target.value)}
                placeholder="Busca..."
                className="w-full bg-transparent pl-2 text-xs font-bold text-stone-600 outline-none truncate"
              />
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button 
              onClick={() => loadData()}
              className="p-2.5 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-emerald-600 transition-all border border-stone-100 bg-white shadow-sm"
              title="Sincronizar"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="p-2.5 hover:bg-rose-50 rounded-xl text-stone-400 hover:text-rose-600 transition-all border border-stone-100 bg-white shadow-sm"
              title="Nuevo Evento (Reset)"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 flex overflow-hidden relative">
        <AnimatePresence mode="wait">
          {viewMode === 'map' ? (
            <motion.div 
              key="map-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              <TransformWrapper
                initialScale={window.innerWidth < 768 ? 0.35 : 0.6}
                minScale={0.1}
                maxScale={4}
                centerOnInit
                limitToBounds={false}
                panning={{ activationKeys: [], lockAxisX: false, lockAxisY: false }}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    {/* Left Toolbar (Zoom & Legends) */}
                    <aside className="w-16 border-r border-stone-200 bg-white flex flex-col items-center py-6 gap-8 z-40 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
                      <div className="flex flex-col gap-2">
                        <button onClick={() => zoomIn()} className="w-10 h-10 border border-stone-200 rounded flex items-center justify-center hover:bg-stone-50 shadow-sm text-stone-600 hover:text-emerald-600 transition-colors">+</button>
                        <button onClick={() => zoomOut()} className="w-10 h-10 border border-stone-200 rounded flex items-center justify-center hover:bg-stone-50 shadow-sm text-stone-600 hover:text-emerald-600 transition-colors">-</button>
                        <button onClick={() => resetTransform()} className="w-10 h-10 border border-stone-200 rounded flex items-center justify-center hover:bg-stone-50 shadow-sm text-stone-600 hover:text-emerald-600 transition-colors"><Maximize size={16}/></button>
                      </div>
                      <div className="flex flex-col gap-6 mt-auto">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-emerald-500 border border-emerald-600 shadow-sm"></div>
                          <span className="text-[8px] font-bold text-stone-400 uppercase">Libre</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-rose-500 border border-rose-600 shadow-sm"></div>
                          <span className="text-[8px] font-bold text-stone-400 uppercase">Ocupado</span>
                        </div>
                      </div>
                    </aside>

                    {/* Floor Plan Grid */}
                    <section className="flex-1 relative bg-stone-100 flex items-center justify-center overflow-hidden">
                      <TransformComponent wrapperClass="!w-full !h-full">
                        <div className="p-24 sm:p-48 relative flex items-center justify-center min-w-max">
                          {/* Landmarks Closer to Grid */}
                          <div className="absolute top-10 sm:top-24 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-stone-100 border-2 border-stone-200 rounded-xl text-stone-400 text-[10px] font-black uppercase tracking-widest shadow-sm z-10">
                            Baños
                          </div>
                          
                          <div className="absolute -right-2 sm:right-16 top-1/2 -translate-y-1/2 rotate-90 px-8 py-2 bg-stone-100 border-2 border-stone-200 rounded-xl text-stone-400 text-[10px] font-black uppercase tracking-widest shadow-sm z-10 w-max">
                            Escenario
                          </div>

                          <div className="absolute bottom-10 sm:bottom-24 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-stone-100 border-2 border-stone-200 rounded-xl text-stone-400 text-[10px] font-black uppercase tracking-widest shadow-sm z-10 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                            Fuente
                          </div>

                          {/* Main Floor Container with Border */}
                          <div className="border-[4px] sm:border-[10px] border-stone-200 bg-white p-8 sm:p-20 rounded-[30px] sm:rounded-[80px] grid grid-cols-11 gap-x-2 sm:gap-x-12 gap-y-4 sm:gap-y-16 relative shadow-2xl">
                            {Array.from({ length: 66 }).map((_, idx) => {
                              const row = Math.floor(idx / 11);
                              const col = idx % 11;
                              const displayTableId = (5 - row) * 11 + col;
                              
                              return (
                                <TableComponent
                                  key={displayTableId}
                                  tableId={displayTableId}
                                  seats={tableData[displayTableId].seats}
                                  names={tableData[displayTableId].names}
                                  onToggle={(seatId) => handleSeatClick(displayTableId, seatId)}
                                  highlightCount={searchActive ? groupSize : undefined}
                                  highlightName={personSearch}
                                  onBulkAssign={handleMapBulkAssign}
                                  selectedSeats={selectedListItems}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </TransformComponent>
                    </section>

                    {/* Right Information Sidebar (Desktop Only) */}
                    <aside className="hidden xl:flex w-64 border-l border-stone-200 bg-white flex-col z-40">
                      <SidebarContent stats={stats} seatsData={seatsData} setShowResetConfirm={setShowResetConfirm} />
                    </aside>
                  </>
                )}
              </TransformWrapper>
            </motion.div>
          ) : (
            <motion.div 
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col bg-stone-50 overflow-hidden"
            >
              <div className="flex-1 flex overflow-hidden relative">
                <ListView 
                  seatsData={seatsData} 
                  personSearch={personSearch}
                  onSave={handleDirectSave}
                  selectedItems={selectedListItems}
                  onToggleSelect={toggleSelection}
                />
                
                {/* Right Information Sidebar in List View (Desktop Only) */}
                <aside className="hidden xl:flex w-64 border-l border-stone-200 bg-white flex-col z-40">
                  <SidebarContent stats={stats} seatsData={seatsData} setShowResetConfirm={setShowResetConfirm} />
                </aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Bulk Action Bar */}
        <AnimatePresence>
          {selectedListItems.size > 0 && (
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 sm:bottom-12 sm:left-1/2 sm:-translate-x-1/2 bg-stone-950 text-white p-5 sm:px-6 sm:py-4 rounded-t-[2rem] sm:rounded-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center gap-4 sm:gap-6 z-[120] border-t sm:border border-stone-800/50 w-full sm:w-max sm:max-w-5xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-start sm:gap-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 leading-none">Seleccionados</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-2xl font-black leading-none text-emerald-400 tabular-nums">{selectedListItems.size}</span>
                    <span className="text-[10px] text-stone-600 font-bold uppercase tracking-tight">Sillas</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setSelectedListItems(new Set())}
                  className="px-4 py-2 sm:hidden bg-stone-900 border border-stone-800 rounded-xl text-rose-500 flex items-center gap-2 active:scale-95 transition-all text-xs font-black uppercase tracking-widest"
                >
                  <RefreshCw size={14} className="opacity-70" />
                  Limpiar
                </button>
              </div>

              <div className="hidden sm:block h-10 w-[1px] bg-stone-800/50"></div>

              <div className="flex flex-col sm:flex-row flex-1 items-center gap-3 w-full sm:w-auto">
                <div className="w-full sm:flex-1 relative group">
                  <input 
                    type="text" 
                    placeholder="Apellido de la familia..."
                    value={bulkFamilyName}
                    onChange={(e) => setBulkFamilyName(e.target.value)}
                    className="bg-stone-900 border border-stone-800 rounded-xl px-5 py-4 sm:py-2.5 text-base sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full placeholder:text-stone-700 text-white transition-all shadow-inner"
                    style={{ fontSize: '16px' }}
                    autoFocus
                    ref={bulkInputRef}
                  />
                </div>
                <button 
                  onClick={handleBulkSave}
                  disabled={!bulkFamilyName.trim() || loading}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-stone-900 disabled:text-stone-800 text-white px-8 py-4.5 sm:py-2.5 rounded-xl text-sm sm:text-xs font-black uppercase tracking-[0.15em] transition-all shadow-xl shadow-emerald-950/40 active:scale-[0.98] border border-emerald-500/20 whitespace-nowrap"
                >
                  {loading ? 'Asignando...' : 'Confirmar Asignación'}
                </button>
                <button 
                  onClick={() => setSelectedListItems(new Set())}
                  className="hidden sm:flex px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-rose-500 items-center gap-2 active:scale-95 transition-transform"
                >
                  <RefreshCw size={14} />
                  <span className="text-xs font-black uppercase tracking-wider">Limpiar</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Overlay for Mobile */}
        <AnimatePresence>
          {showStats && (
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col xl:hidden"
            >
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-black uppercase tracking-widest text-xs">Resumen</h3>
                <button onClick={() => setShowStats(false)} className="p-2">✕</button>
              </div>
              <SidebarContent stats={stats} seatsData={seatsData} setShowResetConfirm={setShowResetConfirm} />
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* Booking Dialog */}
      <AnimatePresence>
        {selectedSeat && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 bg-emerald-700 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">Mesa {selectedSeat.tableId + 1}</h2>
                  <p className="text-xs font-bold opacity-80 uppercase">Silla {(selectedSeat.tableId * 10) + selectedSeat.seatId + 1}</p>
                </div>
                <button onClick={() => setSelectedSeat(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-80 hover:opacity-100">✕</button>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-stone-400 mb-2 tracking-widest underline decoration-emerald-200">Nombre de Familia/Persona</label>
                  <input
                    autoFocus
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Opcional..."
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors font-medium"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSeat(true)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSaveSeat(true)}
                    className="flex flex-col items-center justify-center p-4 bg-rose-50 border-2 border-rose-100 rounded-xl hover:bg-rose-100 transition-all gap-2 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-500 border-2 border-rose-600 shadow-sm group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Ocupar</span>
                  </button>
                  <button
                    onClick={() => handleSaveSeat(false)}
                    className="flex flex-col items-center justify-center p-4 bg-emerald-50 border-2 border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all gap-2 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-emerald-600 shadow-sm group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Liberar</span>
                  </button>
                </div>
              </div>
              <div className="p-4 bg-stone-50 text-center">
                <button onClick={() => setSelectedSeat(null)} className="text-[10px] text-stone-400 uppercase font-black tracking-widest">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Overlay */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-stone-900">¿Nueva Sesión?</h3>
                <p className="text-sm text-stone-500 font-medium mt-2">Esta acción borrará todos los asientos ocupados y nombres registrados permanentemente.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleReset}
                  className="w-full py-4 bg-rose-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all"
                >
                  Confirmar Reset
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-4 text-stone-400 font-black uppercase tracking-widest text-[11px] hover:text-stone-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Bar */}
      <footer className="h-10 bg-stone-900 text-stone-400 px-4 sm:px-8 flex items-center justify-between text-[10px] font-mono tracking-wider shrink-0 z-50">
        <div>V1.1.5</div>
        <div className="flex gap-4 sm:gap-6 items-center">
          <span className="hidden sm:inline">DB_STATUS: ONLINE</span>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 text-[14px]">●</span>
            <span className="animate-pulse font-bold">READY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const ListView = ({ seatsData, personSearch, onSave, selectedItems, onToggleSelect }: { 
  seatsData: Seat[], 
  personSearch: string,
  onSave: (tableId: number, seatId: number, occupied: boolean, name: string) => Promise<void>,
  selectedItems: Set<string>,
  onToggleSelect: (tableId: number, seatId: number) => void
}) => {
  const filteredSeats = useMemo(() => {
    const list: { tableId: number, seatId: number, occupied: boolean, name?: string, globalId: number }[] = [];
    for (let t = 0; t < 66; t++) {
      for (let s = 0; s < 10; s++) {
        const found = seatsData.find(item => item.tableId === t && item.seatId === s);
        list.push({
          tableId: t,
          seatId: s,
          occupied: found?.occupied || false,
          name: found?.name,
          globalId: t * 10 + s + 1
        });
      }
    }

    if (!personSearch) return list;
    const search = personSearch.toLowerCase();
    return list.filter(item => 
      item.name?.toLowerCase().includes(search) || 
      item.globalId.toString().includes(search) ||
      `mesa ${item.tableId + 1}`.includes(search)
    );
  }, [seatsData, personSearch]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-32">
      <div className="max-w-4xl mx-auto space-y-2">
        <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-stone-400 px-2 sm:px-4 mb-4 tracking-widest border-b pb-2">
          <div className="col-span-1"></div>
          <div className="col-span-2">Mesa</div>
          <div className="col-span-1 border-r border-stone-100">Silla</div>
          <div className="col-span-5 sm:col-span-4 pl-2">Persona / Familia</div>
          <div className="col-span-3 sm:col-span-4 text-right">Acción...</div>
        </div>
        
        {filteredSeats.map((item) => (
          <ListRow 
            key={`${item.tableId}-${item.seatId}`}
            item={item}
            onSave={onSave}
            isSelected={selectedItems.has(`${item.tableId}-${item.seatId}`)}
            onToggleSelect={() => onToggleSelect(item.tableId, item.seatId)}
          />
        ))}

        {filteredSeats.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
              <Search size={32} />
            </div>
            <p className="text-stone-400 font-bold uppercase text-xs tracking-widest">No se encontraron resultados</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ListRow = ({ item, onSave, isSelected, onToggleSelect }: { 
  key?: React.Key,
  item: any, 
  onSave: (tableId: number, seatId: number, occupied: boolean, name: string) => Promise<void>,
  isSelected: boolean,
  onToggleSelect: () => void
}) => {
  const [localName, setLocalName] = useState(item.name || '');

  // Synchronize local name with prop updates (e.g. from polling or search reset)
  useEffect(() => {
    setLocalName(item.name || '');
  }, [item.name]);

  return (
    <motion.div 
      layout
      className={`grid grid-cols-12 gap-2 items-center border p-3 rounded-xl shadow-sm transition-all ${
        isSelected 
          ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200' 
          : 'bg-white border-stone-200 hover:shadow-md'
      }`}
    >
      <div className="col-span-1 flex justify-center">
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
        />
      </div>
      <div className="col-span-2 flex flex-col min-w-0">
        <span className="text-[8px] sm:text-[9px] font-bold text-stone-400 uppercase tracking-tighter leading-none mb-1">Mesa</span>
        <span className="text-xs sm:text-sm font-black text-emerald-900 leading-none truncate">{item.tableId + 1}</span>
      </div>
      <div className="col-span-1 flex flex-col border-r border-stone-100 min-w-0">
        <span className="text-[8px] sm:text-[9px] font-bold text-stone-400 uppercase tracking-tighter leading-none mb-1">Silla</span>
        <span className="text-xs sm:text-sm font-black text-emerald-900 leading-none">{item.globalId}</span>
      </div>
      
      <div className="col-span-5 sm:col-span-4 px-1 sm:px-2">
        <input 
          type="text"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          placeholder="Asignar..."
          className="w-full bg-stone-50 border border-stone-100 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-medium placeholder:text-stone-300 truncate"
          style={{ fontSize: '16px' }}
        />
      </div>

      <div className="col-span-3 sm:col-span-4 flex justify-end gap-1.5">
        <button 
          onClick={() => onSave(item.tableId, item.seatId, true, localName)}
          className={`flex-1 sm:flex-none p-1.5 sm:px-4 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
            item.occupied 
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/10'
          }`}
        >
          {item.occupied ? 'Edit' : 'Save'}
        </button>
        <button
          onClick={() => onSave(item.tableId, item.seatId, false, '')}
          className={`p-1.5 sm:px-3 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
            !item.occupied 
              ? 'bg-stone-100 text-stone-300 cursor-not-allowed opacity-50' 
              : 'bg-stone-800 text-white hover:bg-stone-900'
          }`}
          disabled={!item.occupied}
        >
          <span className="sm:hidden">X</span>
          <span className="hidden sm:inline">Liberar</span>
        </button>
      </div>
    </motion.div>
  );
};

const SidebarContent = ({ stats, seatsData, setShowResetConfirm }: any) => (
  <div className="flex flex-col h-full">
    <div className="p-6 border-b border-stone-100">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">Estado del Salón</h3>
      <div className="space-y-4 font-medium">
        <div className="flex justify-between items-end">
          <span className="text-xs text-stone-600">Asientos</span>
          <span className="text-base font-bold">{stats.total}</span>
        </div>
        <div className="flex justify-between items-end">
          <span className="text-xs text-stone-600">Disponibles</span>
          <span className="text-base font-bold text-emerald-600">{stats.free}</span>
        </div>
        <div className="flex justify-between items-end">
          <span className="text-xs text-stone-600">Ocupados</span>
          <span className="text-base font-bold text-rose-600">{stats.occupied}</span>
        </div>
      </div>
      <div className="mt-6 bg-stone-100 rounded-full h-1.5 w-full">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${stats.percent}%` }}
          className="bg-emerald-500 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"
        />
      </div>
      <p className="mt-2 text-[9px] text-stone-400 font-bold uppercase text-right leading-none">
        {stats.percent}% LIBRE
      </p>
    </div>

    <div className="p-6 flex-1 flex flex-col min-h-0">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">Registro con Nombre</h3>
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
        <AnimatePresence initial={false}>
          {seatsData.filter((s: any) => s.name).slice(-10).reverse().map((s: any, idx: number) => (
            <motion.div 
              key={`${s.tableId}-${s.seatId}-${idx}`} 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 items-start border-b border-stone-50 pb-3"
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.occupied ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
              <div>
                <p className="text-[11px] font-bold leading-tight">{s.name}</p>
                <p className="text-[9px] text-stone-400 font-bold tracking-tighter uppercase">Mesa {s.tableId + 1}, Silla {s.seatId + 1}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <button 
        onClick={() => setShowResetConfirm(true)}
        className="w-full py-3 mt-6 border-2 border-stone-100 text-rose-500 font-black uppercase tracking-widest text-[9px] rounded-lg hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
      >
        Nueva Sesión
      </button>
    </div>
  </div>
);
