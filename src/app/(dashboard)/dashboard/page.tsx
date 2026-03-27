import { Card } from "@heroui/react";

const stats = [
  { label: "Total Users", value: "1,234", change: "+12%" },
  { label: "Revenue", value: "$5,678", change: "+8%" },
  { label: "Active Projects", value: "23", change: "+3" },
  { label: "Conversion Rate", value: "3.2%", change: "+0.4%" },
];

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-default-500">Welcome back! Here&apos;s an overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <Card.Content className="gap-1">
              <p className="text-sm text-default-500">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{stat.value}</p>
                <span className="text-sm text-success">{stat.change}</span>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Recent Activity</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-default-500">No recent activity to show.</p>
        </Card.Content>
      </Card>
    </div>
  );
}
