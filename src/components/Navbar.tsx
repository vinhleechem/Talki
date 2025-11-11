import { NavLink } from "react-router-dom";
import { Map, Skull, Trophy, User } from "lucide-react";

const Navbar = () => {
  const navItems = [
    { path: "/roadmap", label: "Bản đồ", icon: Map },
    { path: "/boss", label: "Trùm cuối", icon: Skull },
    { path: "/achievements", label: "Thành tựu", icon: Trophy },
    { path: "/profile", label: "Hồ sơ", icon: User },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-card neo-border-b z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/roadmap" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary neo-border rounded-sm flex items-center justify-center neo-shadow-sm">
              <span className="text-2xl font-black text-primary-foreground">T</span>
            </div>
            <span className="text-xl font-black text-foreground hidden sm:block">Talki</span>
          </NavLink>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 sm:px-4 py-2 rounded-sm font-bold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground neo-border neo-shadow-sm"
                      : "hover:bg-muted"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
