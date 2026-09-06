{/* Tiered Export Quality Selector */}
          <div className="relative flex items-center bg-[#101115] border border-gray-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setExportResolution('720p')}
              className={`px-2.5 py-1 rounded font-semibold transition ${exportResolution === '720p' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              720p HD
            </button>
            <button
              onClick={() => {
                if (!isPro) handleUpgradePro();
                else setExportResolution('1080p');
              }}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${exportResolution === '1080p' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              1080p {!isPro && '🔒'}
            </button>
            <button
              onClick={() => {
                if (!isPro) handleUpgradePro();
                else setExportResolution('2k');
              }}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${exportResolution === '2k' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              2K Cinematic {!isPro && '🔒'}
            </button>
          </div>