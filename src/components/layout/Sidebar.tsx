import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingDown,
  CreditCard,
  Headphones,
  Wifi,
  Star,
  Users,
  ClipboardList,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão Geral", path: "/" },
  { icon: TrendingDown, label: "Churn & Retenção", path: "/churn" },
  { icon: CreditCard, label: "Financeiro", path: "/inadimplencia" },
  { icon: Headphones, label: "Suporte", path: "/suporte" },
  { icon: Wifi, label: "Saúde de Rede", path: "/rede" },
  { icon: Star, label: "NPS & Experiência", path: "/nps" },
  { icon: Users, label: "Clientes & Cohorts", path: "/clientes" },
  { icon: ClipboardList, label: "Ações", path: "/acoes" },
  { icon: BarChart3, label: "Tendências", path: "/tendencias" },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen bg-card border-r sticky top-0 transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && (
          <div>
            <h2 className="font-bold text-lg">Uniforce</h2>
            <span className="text-xs text-muted-foreground">OPS</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground">
            © 2024 Uniforce OPS
          </p>
        </div>
      )}
    </aside>
  );
}
