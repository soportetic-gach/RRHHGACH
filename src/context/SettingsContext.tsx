import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SiteSettings {
    company_name: string;
    primary_color: string;
    secondary_color: string;
    logo_url: string;
    login_logo_url: string;
}

interface SettingsContextType {
    settings: SiteSettings;
    loadingSettings: boolean;
    refreshSettings: () => Promise<void>;
}

const defaultSettings: SiteSettings = {
    company_name: 'Sistema HR Enterprise',
    primary_color: '#1e3a8a',
    secondary_color: '#475569',
    logo_url: '',
    login_logo_url: ''
};

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    loadingSettings: true,
    refreshSettings: async () => { },
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [loadingSettings, setLoadingSettings] = useState(true);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (!error && data) {
                const newSettings = {
                    company_name: data.company_name || defaultSettings.company_name,
                    primary_color: data.primary_color || defaultSettings.primary_color,
                    secondary_color: data.secondary_color || defaultSettings.secondary_color,
                    logo_url: data.logo_url || '',
                    login_logo_url: data.login_logo_url || ''
                };

                setSettings(newSettings);
                applyTheme(newSettings);
            }
        } catch (err) {
            console.error('Error fetching site settings', err);
        } finally {
            setLoadingSettings(false);
        }
    };

    const applyTheme = (currentSettings: SiteSettings) => {
        const root = document.documentElement;
        if (currentSettings.primary_color) {
            root.style.setProperty('--primary-color', currentSettings.primary_color);
            root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${currentSettings.primary_color} 0%, ${currentSettings.secondary_color} 100%)`);
        }
        if (currentSettings.secondary_color) {
            root.style.setProperty('--secondary-color', currentSettings.secondary_color);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, loadingSettings, refreshSettings: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
