import React from 'react';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface UserStatsData {
  totalUsers: number;
  roleDistribution: Record<string, number>;
  recentUsers: User[];
}

interface Props {
  stats: UserStatsData;
}

const UserStats: React.FC<Props> = ({ stats }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '20px',
    }}>
      <StatCard title="Total Users" value={stats.totalUsers} />
      <StatCard title="Role Distribution">
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {Object.entries(stats.roleDistribution).map(([role, count]) => (
            <li key={role}>{`${role.charAt(0).toUpperCase() + role.slice(1)}: ${count}`}</li>
          ))}
        </ul>
      </StatCard>
      <StatCard title="Recently Registered">
        <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'none' }}>
          {stats.recentUsers.map(user => (
            <li key={user._id}>{`${user.firstName} ${user.lastName} (${user.email})`}</li>
          ))}
        </ul>
      </StatCard>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value?: string | number;
  children?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, children }) => {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px', color: '#495057' }}>{title}</h3>
      {value !== undefined && (
        <p style={{ marginTop: 0, marginBottom: 0, fontSize: '24px', fontWeight: 'bold', color: '#212529' }}>{value}</p>
      )}
      {children}
    </div>
  );
};

export default UserStats;
