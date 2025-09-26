import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAppSelector } from '../store/hooks';
import { Package, Users, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import TranslatedText from './TranslatedText';

interface DashboardProps {
  techPacks: any[];
  activities: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ techPacks, activities }) => {
  const { t } = useTranslation();
  const ui = useAppSelector(state => state.ui);

  const stats = [
    {
      title: t('techpack.title'),
      value: techPacks.length,
      icon: Package,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: t('dashboard.stats.approved'),
      value: techPacks.filter(tp => tp.status === 'approved').length,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: t('dashboard.stats.activities'),
      value: activities.length,
      icon: Clock,
      color: 'bg-yellow-500',
      change: '+15%',
      changeType: 'positive'
    },
    {
      title: t('dashboard.stats.team'),
      value: 12,
      icon: Users,
      color: 'bg-purple-500',
      change: '+2',
      changeType: 'positive'
    }
  ];

  const recentActivities = activities.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          <TranslatedText translationKey="dashboard.title" />
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          <TranslatedText translationKey="dashboard.welcome" fallback="Welcome to TechPacker" />
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  vs last month
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <TranslatedText translationKey="dashboard.recentActivities" />
          </h3>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.item} • {activity.time}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                <TranslatedText translationKey="dashboard.noActivities" fallback="No recent activities" />
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <TranslatedText translationKey="dashboard.quickActions" fallback="Quick Actions" />
          </h3>
          <div className="space-y-3">
            <button className="w-full flex items-center space-x-3 p-3 text-left rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Package className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                <TranslatedText translationKey="techpack.create" />
              </span>
            </button>
            <button className="w-full flex items-center space-x-3 p-3 text-left rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                <TranslatedText translationKey="navigation.reports" fallback="View Reports" />
              </span>
            </button>
            <button className="w-full flex items-center space-x-3 p-3 text-left rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                <TranslatedText translationKey="dashboard.alerts" fallback="View Alerts" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;