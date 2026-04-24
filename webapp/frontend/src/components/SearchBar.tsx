interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export default function SearchBar({ searchTerm, setSearchTerm }: SearchBarProps) {
  return (
    <div className="relative h-full">
      <input 
        type="text" 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search player by name..." 
        className="w-full h-full bg-white border border-slate-200 rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-slate-700 font-medium placeholder-slate-400"
      />
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
      
      {searchTerm && (
        <button 
          onClick={() => setSearchTerm("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-6 h-6 flex items-center justify-center transition-colors text-xs font-bold"
        >
          ✕
        </button>
      )}
    </div>
  );
}