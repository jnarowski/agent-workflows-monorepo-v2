function Dashboard() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Users</h2>
          <p className="text-3xl font-bold text-blue-600">1,234</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Revenue</h2>
          <p className="text-3xl font-bold text-green-600">$12,345</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Active Projects</h2>
          <p className="text-3xl font-bold text-purple-600">42</p>
        </div>
      </div>
      <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
        <ul className="space-y-2">
          <li className="border-b pb-2">User John Doe signed up</li>
          <li className="border-b pb-2">
            New project "Website Redesign" created
          </li>
          <li className="border-b pb-2">Payment of $500 received</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
