import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus, Home, Zap } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <h1>
            <div className="logo-icon">
              <Zap size={20} />
            </div>
            Workflow Engine
          </h1>
          <nav>
            <Link
              to="/"
              className={`nav-link ${isActive("/") ? "active" : ""}`}
            >
              <Home size={16} />
              Dashboard
            </Link>
            <Link
              to="/create"
              className={`nav-link ${isActive("/create") ? "active" : ""}`}
            >
              <Plus size={16} />
              Create Workflow
            </Link>
          </nav>
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
};
