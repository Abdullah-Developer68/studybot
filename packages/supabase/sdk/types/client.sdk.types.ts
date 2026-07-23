// Minimal storage contract shared by both platforms: on web, omit storage so
// supabase-js falls back to localStorage; on React Native, the Expo app
// passes AsyncStorage here so sessions survive app restarts.
export type SupabaseStorageAdapter = {
	getItem: (key: string) => string | null | Promise<string | null>;
	setItem: (key: string, value: string) => void | Promise<void>;
	removeItem: (key: string) => void | Promise<void>;
};

export type InitializeSupabaseOptions = {
	url: string;
	publishableKey: string;
	// Optional storage override — required on React Native (AsyncStorage).
	storage?: SupabaseStorageAdapter;
	// Must be false on native since there is no browser URL to parse OAuth
	// redirects from. Keep the default (true) on web for OAuth to work.
	detectSessionInUrl?: boolean;
};
