import React from 'react';
import { 
  TrendingUp, 
  Package, 
  Clock, 
  CheckCircle,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { TechPack } from '../types';

interface DashboardProps {
  techPacks: TechPack[];
}

export const Dashboard: React.FC<DashboardProps> = ({ techPacks }) => {
  const stats = [
    {
      title: 'Total Tech Packs',
      value: techPacks.length.toString(),
      change: '+12%',
      trend: 'up',
      icon: FileText,
      color: 'bg-blue-500'
    },
    {
      title: 'In Production',
      value: techPacks.filter(tp => tp.status === 'production').length.toString(),
      change: '+8%',
      trend: 'up',
      icon: Package,
      color: 'bg-green-500'
    },
    {
      title: 'Under Review',
      value: techPacks.filter(tp => tp.status === 'review').length.toString(),
      change: '-3%',
      trend: 'down',
      icon: Clock,
      color: 'bg-yellow-500'
    },
    {
      title: 'Approved',
      value: techPacks.filter(tp => tp.status === 'approved').length.toString(),
      change: '+15%',
      trend: 'up',
      icon: CheckCircle,
      color: 'bg-teal-500'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      action: 'Tech pack approved',
      item: 'Classic Button Down Shirt',
      time: '2 hours ago',
      user: 'Sarah Johnson'
    },
    {
      id: 2,
      action: 'New tech pack created',
      item: 'Summer Dress Collection',
      time: '4 hours ago',
      user: 'Mike Chen'
    },
    {
      id: 3,
      action: 'Measurements updated',
      item: 'Denim Jacket',
      time: '6 hours ago',
      user: 'Emma Wilson'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className={`w-4 h-4 ${
                      stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <span className={`text-sm ml-1 ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tech Packs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tech Packs</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {techPacks.slice(0, 5).map((techPack) => (
                <div key={techPack.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <img
                      src={techPack.images[0]}
                      alt={techPack.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{techPack.name}</h4>
                      <p className="text-sm text-gray-500">{techPack.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      techPack.status === 'approved' ? 'bg-green-100 text-green-800' :
                      techPack.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                      techPack.status === 'production' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {techPack.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="bg-teal-100 p-2 rounded-full">
                    <CheckCircle className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.action}</span> for{' '}
                      <span className="font-medium">{activity.item}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      by {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
            Alerts & Notifications
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Denim Jacket</span> has been pending review for 5 days
                </p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                <p className="text-sm text-blue-800">
                  Season deadline approaching: <span className="font-medium">Spring 2024 collection</span> due in 2 weeks
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};