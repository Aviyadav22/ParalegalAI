export default function ChromaMultiOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-full">
          <label className="text-white text-sm font-semibold block mb-3">
            ChromaDB Endpoints (Comma-separated)
          </label>
          <input
            type="text"
            name="ChromaEndpoints"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="http://localhost:8001,http://localhost:8002,http://localhost:8003"
            defaultValue={settings?.ChromaEndpoints}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-theme-settings-input-placeholder text-xs mt-2">
            Enter multiple ChromaDB endpoints separated by commas. The system will use round-robin distribution across these instances.
          </p>
        </div>
      </div>

      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            API Header (Optional)
          </label>
          <input
            name="ChromaApiHeader"
            autoComplete="off"
            type="text"
            defaultValue={settings?.ChromaApiHeader}
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="X-Api-Key"
          />
        </div>

        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            API Key (Optional)
          </label>
          <input
            name="ChromaApiKey"
            autoComplete="off"
            type="password"
            defaultValue={settings?.ChromaApiKey ? "*".repeat(20) : ""}
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="sk-myApiKeyToAccessMyChromaInstance"
          />
        </div>

        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            Batch Size
          </label>
          <input
            name="ChromaBatchSize"
            autoComplete="off"
            type="number"
            defaultValue={settings?.ChromaBatchSize || "10"}
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="10"
            min="1"
            max="100"
          />
        </div>
      </div>

      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            Max Concurrent Batches
          </label>
          <input
            name="ChromaMaxConcurrentBatches"
            autoComplete="off"
            type="number"
            defaultValue={settings?.ChromaMaxConcurrentBatches || "3"}
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="3"
            min="1"
            max="10"
          />
        </div>

        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            Node Count
          </label>
          <input
            name="ChromaNodeCount"
            autoComplete="off"
            type="number"
            defaultValue={settings?.ChromaNodeCount || "3"}
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="3"
            min="1"
            max="10"
          />
        </div>
      </div>
    </div>
  );
}
