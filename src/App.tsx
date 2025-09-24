import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TechPackList } from './components/TechPackList';
import { TechPackDetail } from './components/TechPackDetail';
import { MaterialsLibrary } from './components/MaterialsLibrary';
import { MeasurementsManagement } from './components/MeasurementsManagement';
import { ColorwaysManagement } from './components/ColorwaysManagement';
import { TechPack, Activity } from './types';
import { mockTechPacks } from './data/mockData';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import { api, isApiConfigured } from './lib/api';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedTechPack, setSelectedTechPack] = useState<TechPack | null>(null);
  const [techPacks, setTechPacks] = useState<TechPack[]>(mockTechPacks);
  const [activities, setActivities] = useState<Activity[]>([]);

  const useApi = useMemo(() => isApiConfigured(), []);
  const useSupabase = useMemo(() => !useApi && isSupabaseConfigured(), [useApi]);

  // One-time migration from localStorage to API (Mongo) when API becomes available
  useEffect(() => {
    if (!useApi) return;
    const alreadyMigrated = localStorage.getItem('migrated_to_api');
    if (alreadyMigrated) return;
    (async () => {
      try {
        const storedTechPacks = localStorage.getItem('techpacks');
        const storedActivities = localStorage.getItem('activities');
        if (!storedTechPacks && !storedActivities) {
          localStorage.setItem('migrated_to_api', 'true');
          return;
        }
        // Migrate techpacks
        if (storedTechPacks) {
          const parsed = JSON.parse(storedTechPacks) as Array<
            Omit<TechPack, 'dateCreated' | 'lastModified'> & { dateCreated: string; lastModified: string }
          >;
          for (const tp of parsed) {
            const revived: TechPack = {
              ...tp,
              dateCreated: new Date(tp.dateCreated),
              lastModified: new Date(tp.lastModified)
            } as unknown as TechPack;
            try {
              await api.createTechPack(revived);
            } catch {
              // ignore individual failures to allow best-effort migration
            }
          }
        }
        // Migrate activities
        if (storedActivities) {
          const parsedActs = JSON.parse(storedActivities) as Activity[];
          for (const a of parsedActs) {
            try {
              await api.createActivity(a);
            } catch {
              // ignore
            }
          }
        }
        localStorage.setItem('migrated_to_api', 'true');
        // Optionally clear local copies after migration
        // localStorage.removeItem('techpacks');
        // localStorage.removeItem('activities');
      } catch (e) {
        console.error('Migration to API failed', e);
      }
    })();
  }, [useApi]);

  // On first load, hydrate from localStorage if available
  useEffect(() => {
    if (useApi) {
      // Load from REST API (Mongo)
      (async () => {
        try {
          const [tpData, actData] = await Promise.all([
            api.listTechPacks(),
            api.listActivities()
          ]);
          const revivedTP: TechPack[] = tpData.map((row) => ({
            ...row,
            dateCreated: new Date((row as any).dateCreated ?? (row as any).date_created ?? new Date()),
            lastModified: new Date((row as any).lastModified ?? (row as any).last_modified ?? new Date())
          }));
          setTechPacks(revivedTP);
          setActivities(actData);
        } catch (error) {
          console.error('Failed to load from API', error);
        }
      })();
    } else if (useSupabase && supabase) {
      // Load from Supabase
      (async () => {
        try {
          const { data: tpData, error: tpError } = await supabase
            .from('techpacks')
            .select('*')
            .order('last_modified', { ascending: false });
          if (tpError) throw tpError;
          const revivedTP: TechPack[] = (tpData as any[]).map((row) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            status: row.status,
            dateCreated: new Date(row.date_created),
            lastModified: new Date(row.last_modified),
            season: row.season,
            brand: row.brand,
            designer: row.designer,
            images: row.images || [],
            materials: row.materials || [],
            measurements: row.measurements || [],
            constructionDetails: row.construction_details || [],
            colorways: row.colorways || []
          }));
          setTechPacks(revivedTP);

          const { data: actData, error: actError } = await supabase
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false });
          if (actError) throw actError;
          const revivedAct: Activity[] = (actData as any[]).map((a) => ({
            id: a.id,
            action: a.action,
            item: a.item,
            time: a.time,
            user: a.user_name
          }));
          setActivities(revivedAct);
        } catch (error) {
          console.error('Failed to load from Supabase', error);
        }
      })();
    } else {
      // Load from localStorage
      try {
        const storedTechPacks = localStorage.getItem('techpacks');
        const storedActivities = localStorage.getItem('activities');
        if (storedTechPacks) {
          const parsed = JSON.parse(storedTechPacks) as Array<
            Omit<TechPack, 'dateCreated' | 'lastModified'> & { dateCreated: string; lastModified: string }
          >;
          const revived: TechPack[] = parsed.map((tp) => ({
            ...tp,
            dateCreated: new Date(tp.dateCreated),
            lastModified: new Date(tp.lastModified)
          }));
          setTechPacks(revived);
        }
        if (storedActivities) {
          const parsedActivities = JSON.parse(storedActivities) as Activity[];
          setActivities(parsedActivities);
        }
      } catch (error) {
        console.error('Failed to load from localStorage', error);
      }
    }
  }, [useApi, useSupabase]);

  // Persist changes to localStorage
  useEffect(() => {
    if (useApi || useSupabase) return; // Do not persist locally when using API or Supabase
    try {
      const serializable = techPacks.map((tp) => ({
        ...tp,
        dateCreated: tp.dateCreated.toISOString(),
        lastModified: tp.lastModified.toISOString()
      }));
      localStorage.setItem('techpacks', JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to save techpacks to localStorage', error);
    }
  }, [techPacks, useApi, useSupabase]);

  useEffect(() => {
    if (useApi || useSupabase) return; // Do not persist locally when using API or Supabase
    try {
      localStorage.setItem('activities', JSON.stringify(activities));
    } catch (error) {
      console.error('Failed to save activities to localStorage', error);
    }
  }, [activities, useApi, useSupabase]);

  const handleViewTechPack = (techPack: TechPack) => {
    setSelectedTechPack(techPack);
    setCurrentPage('techpack-detail');
  };

  const handleBackToList = () => {
    setSelectedTechPack(null);
    setCurrentPage('techpacks');
  };

  const handleCreateTechPack = async (
    techPackData: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>
  ) => {
    const newTechPack: TechPack = {
      ...techPackData,
      id: Date.now().toString(),
      dateCreated: new Date(),
      lastModified: new Date()
    };
    if (useApi) {
      try {
        await api.createTechPack(newTechPack);
      } catch (e) {
        console.error('Failed to create techpack via API', e);
      }
    } else if (useSupabase && supabase) {
      try {
        const { error } = await supabase.from('techpacks').insert({
          id: newTechPack.id,
          name: newTechPack.name,
          category: newTechPack.category,
          status: newTechPack.status,
          date_created: newTechPack.dateCreated.toISOString(),
          last_modified: newTechPack.lastModified.toISOString(),
          season: newTechPack.season,
          brand: newTechPack.brand,
          designer: newTechPack.designer,
          images: newTechPack.images,
          materials: newTechPack.materials,
          measurements: newTechPack.measurements,
          construction_details: newTechPack.constructionDetails,
          colorways: newTechPack.colorways
        });
        if (error) throw error;
      } catch (e) {
        console.error('Failed to create techpack in Supabase', e);
      }
    }
    setTechPacks((prev) => [...prev, newTechPack]);
    const newActivity: Activity = {
      id: `a${Date.now()}`,
      action: 'New tech pack created',
      item: newTechPack.name,
      time: 'just now',
      user: 'You'
    };
    if (useApi) {
      try {
        await api.createActivity(newActivity);
      } catch (e) {
        console.error('Failed to add activity via API', e);
      }
    } else if (useSupabase && supabase) {
      try {
        const { error } = await supabase.from('activities').insert({
          id: newActivity.id,
          action: newActivity.action,
          item: newActivity.item,
          time: newActivity.time,
          user_name: newActivity.user
        });
        if (error) throw error;
      } catch (e) {
        console.error('Failed to add activity in Supabase', e);
      }
    }
    setActivities((prev) => [newActivity, ...prev]);
  };

  const handleUpdateTechPack = async (
    id: string,
    techPackData: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>
  ) => {
    const updatedAt = new Date();
    if (useApi) {
      try {
        await api.updateTechPack(id, {
          ...techPackData,
          lastModified: updatedAt
        } as any);
      } catch (e) {
        console.error('Failed to update techpack via API', e);
      }
    } else if (useSupabase && supabase) {
      try {
        const { error } = await supabase
          .from('techpacks')
          .update({
            name: techPackData.name,
            category: techPackData.category,
            status: techPackData.status,
            season: techPackData.season,
            brand: techPackData.brand,
            designer: techPackData.designer,
            images: techPackData.images,
            materials: techPackData.materials,
            measurements: techPackData.measurements,
            construction_details: techPackData.constructionDetails,
            colorways: techPackData.colorways,
            last_modified: updatedAt.toISOString()
          })
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to update techpack in Supabase', e);
      }
    }
    setTechPacks((prev) =>
      prev.map((tp) =>
        tp.id === id
          ? { ...techPackData, id, dateCreated: tp.dateCreated, lastModified: updatedAt }
          : tp
      )
    );
    const activity: Activity = {
      id: `a${Date.now()}`,
      action: 'Tech pack updated',
      item: techPackData.name,
      time: 'just now',
      user: 'You'
    };
    if (useApi) {
      try {
        await api.createActivity(activity);
      } catch (e) {
        console.error('Failed to add activity via API', e);
      }
    } else if (useSupabase && supabase) {
      try {
        const { error } = await supabase.from('activities').insert({
          id: activity.id,
          action: activity.action,
          item: activity.item,
          time: activity.time,
          user_name: activity.user
        });
        if (error) throw error;
      } catch (e) {
        console.error('Failed to add activity in Supabase', e);
      }
    }
    setActivities((prev) => [activity, ...prev]);
    if (selectedTechPack && selectedTechPack.id === id) {
      setSelectedTechPack({
        ...techPackData,
        id,
        dateCreated: selectedTechPack.dateCreated,
        lastModified: updatedAt
      });
    }
  };

  const handleDeleteTechPack = async (id: string) => {
    const deleted = techPacks.find((tp) => tp.id === id);
    if (useApi) {
      try {
        await api.deleteTechPack(id);
      } catch (e) {
        console.error('Failed to delete techpack via API', e);
      }
    } else if (useSupabase && supabase) {
      try {
        const { error } = await supabase.from('techpacks').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete techpack in Supabase', e);
      }
    }
    setTechPacks((prev) => prev.filter((tp) => tp.id !== id));
    if (deleted) {
      const activity: Activity = {
        id: `a${Date.now()}`,
        action: 'Tech pack deleted',
        item: deleted.name,
        time: 'just now',
        user: 'You'
      };
      if (useSupabase && supabase) {
        try {
          const { error } = await supabase.from('activities').insert({
            id: activity.id,
            action: activity.action,
            item: activity.item,
            time: activity.time,
            user_name: activity.user
          });
          if (error) throw error;
        } catch (e) {
          console.error('Failed to add activity in Supabase', e);
        }
      }
      setActivities((prev) => [activity, ...prev]);
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard techPacks={techPacks} activities={activities} />;
      case 'techpacks':
        return (
          <TechPackList 
            onViewTechPack={handleViewTechPack}
            techPacks={techPacks}
            onCreateTechPack={handleCreateTechPack}
            onUpdateTechPack={handleUpdateTechPack}
            onDeleteTechPack={handleDeleteTechPack}
          />
        );
      case 'techpack-detail':
        return selectedTechPack ? (
          <TechPackDetail 
            techPack={selectedTechPack} 
            onBack={handleBackToList}
            onUpdate={handleUpdateTechPack}
            onDelete={handleDeleteTechPack}
          />
        ) : (
          <div>Tech pack not found</div>
        );
      case 'measurements':
        return <MeasurementsManagement />;
      case 'materials':
        return <MaterialsLibrary />;
      case 'colorways':
        return <ColorwaysManagement />;
      case 'analytics':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600">Coming soon - Production insights and performance metrics</p>
          </div>
        );
      case 'team':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Management</h3>
            <p className="text-gray-600">Coming soon - Manage team members and permissions</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Settings</h3>
            <p className="text-gray-600">Coming soon - Application preferences and configurations</p>
          </div>
        );
      default:
        return <Dashboard techPacks={techPacks} activities={activities} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderContent()}
    </Layout>
  );
}

export default App;